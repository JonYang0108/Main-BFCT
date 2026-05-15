import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import PaymentMethodBadge from "@/components/payments/PaymentMethodBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { formatCurrency } from "@/lib/payment-utils";
import { paymentService } from "@/services/paymentService";
import { stallService } from "@/services/stallService";
import { vendorService } from "@/services/vendorService";
import type { PaymentMethodKey, PaymentRecord, StallRow, VendorOption } from "@/types/domain";

interface PaymentFormState {
  amount: string;
  notes: string;
  paymentDate: string;
  paymentMethod: PaymentMethodKey;
  periodMonth: number;
  periodYear: number;
  receiptNumber: string;
  stallId: string;
  vendorId: string;
}

const initialFormState: PaymentFormState = {
  amount: "",
  notes: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: "cash",
  periodMonth: new Date().getMonth() + 1,
  periodYear: new Date().getFullYear(),
  receiptNumber: "",
  stallId: "",
  vendorId: "",
};

const statusStyles: Record<string, string> = {
  overdue: "border-destructive/20 bg-destructive/10 text-destructive",
  paid: "border-primary/20 bg-primary/10 text-primary",
  pending: "border-secondary/20 bg-secondary/10 text-secondary",
};

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function StaffPayments() {
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [stalls, setStalls] = useState<StallRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [stallsData, vendorData, paymentData] = await Promise.all([
        stallService.listRawStalls("occupied"),
        vendorService.listActiveVendors(),
        paymentService.listStaffPayments(),
      ]);

      setPayments(paymentData);
      setStalls(stallsData);
      setVendors(vendorData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load payments.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useRealtimeRefresh({
    channelName: "staff-payments-table",
    onRefresh: loadPayments,
    table: "payments",
  });

  useRealtimeRefresh({
    channelName: "staff-payments-stalls",
    onRefresh: loadPayments,
    table: "stalls",
  });

  useRealtimeRefresh({
    channelName: "staff-payments-profiles",
    onRefresh: loadPayments,
    table: "profiles",
  });

  const availableStalls = useMemo(
    () =>
      form.vendorId
        ? stalls.filter((stall) => stall.vendor_id === form.vendorId)
        : stalls,
    [form.vendorId, stalls],
  );

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return payments;
    }

    return payments.filter((payment) => {
      return (
        payment.vendorName.toLowerCase().includes(query) ||
        (payment.stallNumber ?? "").toLowerCase().includes(query) ||
        (payment.receiptNumber ?? "").toLowerCase().includes(query)
      );
    });
  }, [payments, search]);

  const totalPaid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalPending = payments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totals = [
    {
      icon: CreditCard,
      label: "Transactions",
      value: payments.length.toString(),
    },
    { icon: CheckCircle, label: "Collected", value: formatCurrency(totalPaid) },
    { icon: Clock, label: "Pending", value: formatCurrency(totalPending) },
    {
      icon: TrendingUp,
      label: "Completed",
      value: payments
        .filter((payment) => payment.status === "paid")
        .length.toString(),
    },
  ];

  const resetForm = () => {
    setForm(initialFormState);
  };

  const handleModalChange = (open: boolean) => {
    setAddModalOpen(open);

    if (!open) {
      resetForm();
    }
  };

  const handleSave = async () => {
    if (!form.vendorId) {
      toast({
        description: "Select a vendor account first.",
        title: "Vendor required",
        variant: "destructive",
      });
      return;
    }

    if (!form.stallId) {
      toast({
        description: "Select a stall assigned to the vendor.",
        title: "Stall required",
        variant: "destructive",
      });
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      toast({
        description: "Enter a valid payment amount.",
        title: "Invalid amount",
        variant: "destructive",
      });
      return;
    }

    const selectedStall = stalls.find((stall) => stall.id === form.stallId);

    if (selectedStall?.vendor_id && selectedStall.vendor_id !== form.vendorId) {
      toast({
        description: "The selected stall does not belong to the chosen vendor.",
        title: "Vendor and stall mismatch",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const payment = await paymentService.addPayment({
        amount: Number(form.amount),
        notes: form.notes.trim() || null,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        periodMonth: form.periodMonth,
        periodYear: form.periodYear,
        receiptNumber: form.receiptNumber.trim() || null,
        stallId: form.stallId,
        status: "paid",
        vendorId: form.vendorId,
      });

      setPayments((current) => [payment, ...current]);
      toast({ title: "Payment recorded successfully" });
      handleModalChange(false);
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Failed to record payment.",
        title: "Save failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Payment History
            </h1>
            <p className="text-sm text-muted-foreground">
              Record staff-collected payments and monitor transaction history.
            </p>
          </div>

          <Button
            onClick={() => setAddModalOpen(true)}
            className="gap-2 bg-gradient-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {totals.map((item) => (
            <Card key={item.label} className="p-4">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <item.icon className="mb-2 h-5 w-5 text-primary" />
                  <p className="font-display text-2xl font-bold text-foreground">
                    {item.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </>
              )}
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 font-display font-semibold text-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              All Payments
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search vendor, stall, or receipt..."
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Stall</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No payments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.vendorName}
                        </TableCell>
                        <TableCell>
                          {payment.stallNumber
                            ? `Stall ${payment.stallNumber}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {months[(payment.periodMonth ?? 1) - 1]}{" "}
                          {payment.periodYear ?? "-"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(payment.amount || 0))}
                        </TableCell>
                        <TableCell>
                          <PaymentMethodBadge method={payment.paymentMethod} />
                        </TableCell>
                        <TableCell>
                          {payment.paymentDate
                            ? new Date(payment.paymentDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{payment.receiptNumber || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              statusStyles[payment.status] ??
                              statusStyles.pending
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={addModalOpen} onOpenChange={handleModalChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>Enter the payment details and submit the record.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={form.vendorId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    stallId: "",
                    vendorId: value,
                  }))
                }
              >
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.userId} value={vendor.userId}>
                      {vendor.fullName}
                      {vendor.businessName ? ` (${vendor.businessName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stall">Stall</Label>
              <Select
                value={form.stallId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, stallId: value }))
                }
              >
                <SelectTrigger id="stall">
                  <SelectValue
                    placeholder={
                      form.vendorId
                        ? "Select the vendor's stall"
                        : "Select a vendor first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableStalls.length === 0 ? (
                    <SelectItem value="no-stalls" disabled>
                      No occupied stalls available
                    </SelectItem>
                  ) : (
                    availableStalls.map((stall) => (
                      <SelectItem key={stall.id} value={stall.id}>
                        Stall {stall.stall_number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value: PaymentMethodKey) =>
                    setForm((current) => ({ ...current, paymentMethod: value }))
                  }
                >
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="maya">Maya</SelectItem>
                    <SelectItem value="cliqq">Cliqq</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Select
                  value={String(form.periodMonth)}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      periodMonth: Number(value),
                    }))
                  }
                >
                  <SelectTrigger id="month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={form.periodYear}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      periodYear: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt Number</Label>
              <Input
                id="receipt"
                placeholder="Optional receipt number"
                value={form.receiptNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    receiptNumber: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Optional notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleModalChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-gradient-primary text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
