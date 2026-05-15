import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Wallet,
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import PaymentMethodBadge from "@/components/payments/PaymentMethodBadge";
import PaymentModule from "@/components/vendor/PaymentModule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { formatCurrency } from "@/lib/payment-utils";
import { paymentService } from "@/services/paymentService";
import { stallService } from "@/services/stallService";
import type { PaymentRecord, StallRow } from "@/types/domain";

const statusStyles: Record<string, string> = {
  overdue: "border-destructive/20 bg-destructive/10 text-destructive",
  paid: "border-primary/20 bg-primary/10 text-primary",
  pending: "border-secondary/20 bg-secondary/10 text-secondary",
};

export default function VendorPayments() {
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [stall, setStall] = useState<StallRow | null>(null);

  const loadPayments = useCallback(async () => {
    if (!user) {
      setPayments([]);
      setStall(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const [stallsData, paymentData] = await Promise.all([
        stallService.listVendorRawStalls(user.id),
        paymentService.listPayments({ vendorId: user.id }),
      ]);

      setPayments(paymentData);
      setStall(stallsData[0] ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load your payments.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useRealtimeRefresh({
    channelName: "vendor-payments",
    onRefresh: loadPayments,
    table: "payments",
  });

  const totalPaid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalPending = payments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalOverdue = payments
    .filter((payment) => payment.status === "overdue")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const summaryCards = [
    {
      icon: CheckCircle,
      label: "Total Paid",
      value: formatCurrency(totalPaid),
    },
    { icon: Clock, label: "Pending", value: formatCurrency(totalPending) },
    {
      icon: AlertTriangle,
      label: "Overdue",
      value: formatCurrency(totalOverdue),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              My Payments
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your payment history and review each payment method clearly.
            </p>
          </div>

          <Button
            onClick={() => setPayDialogOpen(true)}
            disabled={!stall}
            className="gap-2 bg-gradient-primary text-primary-foreground"
          >
            <Wallet className="h-4 w-4" />
            Pay Online
          </Button>
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-3 p-4">
                {loading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {card.label}
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {card.value}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment History
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-center">
                <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 font-semibold text-foreground">
                  No Payments Yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your payment records will appear here once recorded.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Receipt #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.periodMonth}/{payment.periodYear}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(payment.amount || 0))}
                        </TableCell>
                        <TableCell>
                          <PaymentMethodBadge method={payment.paymentMethod} />
                        </TableCell>
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
                        <TableCell>
                          {payment.paymentDate
                            ? new Date(payment.paymentDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{payment.receiptNumber || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PaymentModule
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        stall={stall}
        onSuccess={loadPayments}
      />
    </DashboardLayout>
  );
}
