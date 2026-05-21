import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  X,
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

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/payment-utils";
import { paymentService } from "@/services/paymentService";
import { stallService } from "@/services/stallService";
import { vendorService } from "@/services/vendorService";
import type {
  PaymentRecord,
  StallRow,
  VendorOption,
} from "@/types/domain";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 5;

const NOW = () => new Date();
const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
const MS_30D = 30 * MS_24H;
const MS_365D = 365 * MS_24H;

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const STATUS_STYLES: Record<string, string> = {
  paid: "border-primary/20 bg-primary/10 text-primary",
  pending: "border-secondary/20 bg-secondary/10 text-secondary",
  overdue: "border-destructive/20 bg-destructive/10 text-destructive",
};

// ─── Time-window helpers ──────────────────────────────────────────────────────

function withinWindow(payment: PaymentRecord, ms: number): boolean {
  if (!payment.paymentDate) return false;
  const age = NOW().getTime() - new Date(payment.paymentDate).getTime();
  return age >= 0 && age <= ms;
}

// ─── Window Card config ───────────────────────────────────────────────────────

const WINDOWS = [
  {
    key: "24h",
    label: "Last 24 Hours",
    ms: MS_24H,
    icon: Clock,
    color: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      icon: "text-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      bar: "bg-emerald-500",
    },
  },
  {
    key: "7d",
    label: "Last 7 Days",
    ms: MS_7D,
    icon: Calendar,
    color: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/5",
      icon: "text-blue-500",
      badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      bar: "bg-blue-500",
    },
  },
  {
    key: "30d",
    label: "Last 30 Days",
    ms: MS_30D,
    icon: TrendingUp,
    color: {
      border: "border-violet-500/30",
      bg: "bg-violet-500/5",
      icon: "text-violet-500",
      badge: "bg-violet-500/10 text-violet-600 border-violet-500/20",
      bar: "bg-violet-500",
    },
  },
  {
    key: "365d",
    label: "Last 365 Days",
    ms: MS_365D,
    icon: CreditCard,
    color: {
      border: "border-orange-500/30",
      bg: "bg-orange-500/5",
      icon: "text-orange-500",
      badge: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      bar: "bg-orange-500",
    },
  },
] as const;

// ─── Add Payment form state ───────────────────────────────────────────────────

interface AddPaymentForm {
  vendorId: string;
  stallId: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  periodMonth: number;
  periodYear: number;
  paymentDate: string;
}

const INITIAL_FORM: AddPaymentForm = {
  vendorId: "",
  stallId: "",
  amount: "",
  status: "paid",
  periodMonth: new Date().getMonth() + 1,
  periodYear: new Date().getFullYear(),
  paymentDate: new Date().toISOString().split("T")[0],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const { toast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [stalls, setStalls] = useState<StallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Add payment modal ───────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddPaymentForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // ── History table state ─────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [paymentData, vendorData, stallData] = await Promise.all([
        paymentService.listAdminPayments(),
        vendorService.listActiveVendors(),
        stallService.listRawStalls(),
      ]);
      setPayments(paymentData);
      setVendors(vendorData);
      setStalls(stallData);
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to load payments.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeRefresh({
    channelName: "admin-payments-main",
    onRefresh: loadData,
    table: "payments",
  });
  useRealtimeRefresh({
    channelName: "admin-payments-profiles",
    onRefresh: loadData,
    table: "profiles",
  });
  useRealtimeRefresh({
    channelName: "admin-payments-stalls",
    onRefresh: loadData,
    table: "stalls",
  });

  // ── Summary stats (all time) ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCollected = payments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalPending = payments
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalOverdue = payments
      .filter((p) => p.status === "overdue")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return { totalCollected, totalPending, totalOverdue, count: payments.length };
  }, [payments]);

  // ── Window buckets ──────────────────────────────────────────────────────────
  const windowData = useMemo(
    () =>
      WINDOWS.map((w) => {
        const subset = payments.filter((p) => withinWindow(p, w.ms));
        const total = subset
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        return { ...w, payments: subset, total, count: subset.length };
      }),
    [payments],
  );

  // ── Filtered + sorted history ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (filterStatus !== "all" && p.status !== filterStatus) return false;
        if (filterMethod !== "all" && p.paymentMethod !== filterMethod)
          return false;
        if (filterVendor !== "all" && p.vendorId !== filterVendor) return false;
        if (!q) return true;
        return (
          (p.vendorName ?? "").toLowerCase().includes(q) ||
          (p.stallNumber ?? "").toLowerCase().includes(q) ||
          (p.receiptNumber ?? "").toLowerCase().includes(q) ||
          (p.paymentMethod ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = new Date(a.paymentDate ?? 0).getTime();
        const db = new Date(b.paymentDate ?? 0).getTime();
        return sortDir === "desc" ? db - da : da - db;
      });
  }, [payments, search, filterStatus, filterMethod, filterVendor, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterMethod, filterVendor, sortDir]);

  // ── Stalls for selected vendor ──────────────────────────────────────────────
  const vendorStalls = useMemo(
    () =>
      form.vendorId
        ? stalls.filter((s) => s.vendor_id === form.vendorId)
        : stalls,
    [form.vendorId, stalls],
  );

  // ── Add payment submit ──────────────────────────────────────────────────────
  const handleAddPayment = async () => {
    if (!form.vendorId || !form.stallId || !form.amount) {
      toast({
        title: "Missing fields",
        description: "Vendor, stall, and amount are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await paymentService.addPayment({
        vendorId: form.vendorId,
        stallId: form.stallId,
        amount: Number(form.amount),
        paymentMethod: "cash",
        status: form.status,
        periodMonth: form.periodMonth,
        periodYear: form.periodYear,
        paymentDate: new Date(form.paymentDate).toISOString(),
        receiptNumber: null,
        notes: null,
      });

      toast({
        title: "Payment recorded",
        description: "The payment has been added to the history.",
      });
      setAddOpen(false);
      setForm(INITIAL_FORM);
      await loadData();
    } catch (e) {
      toast({
        title: "Failed to save",
        description: e instanceof Error ? e.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = filtered.map((p) => ({
      Date: p.paymentDate ? new Date(p.paymentDate).toLocaleString() : "-",
      Vendor: p.vendorName ?? "",
      Stall: p.stallNumber ?? "",
      Amount: p.amount,
      Method: p.paymentMethod ?? "",
      Period: `${MONTHS[(p.periodMonth ?? 1) - 1]} ${p.periodYear}`,
      Status: p.status,
      Receipt: p.receiptNumber ?? "",
      Notes: p.notes ?? "",
    }));

    const headers = Object.keys(rows[0] ?? {});
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => escape(r[h as keyof typeof r])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Payment Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Single source of truth — all payments are permanently stored and
              never deleted.
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="gap-2 bg-gradient-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>

        {errorMessage && (
          <Card className="p-4 text-sm text-destructive border-destructive/30 bg-destructive/5">
            {errorMessage}
          </Card>
        )}

        {/* ── Top summary stat cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Collected",
              value: formatCurrency(stats.totalCollected),
              icon: TrendingUp,
              color: "text-primary",
            },
            {
              label: "Pending",
              value: formatCurrency(stats.totalPending),
              icon: Clock,
              color: "text-secondary",
            },
            {
              label: "Overdue",
              value: formatCurrency(stats.totalOverdue),
              icon: AlertTriangle,
              color: "text-destructive",
            },
            {
              label: "Total Records",
              value: String(stats.count),
              icon: CreditCard,
              color: "text-primary",
            },
          ].map((card) => (
            <Card key={card.label} className="p-4 shadow-card">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-start gap-3">
                  <card.icon className={`h-5 w-5 ${card.color} mt-1 shrink-0`} />
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* ── Time-window cards ── */}
        <div>
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Recent Activity Windows
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Payments are automatically classified by recency. All records remain
            permanently stored in the database.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {windowData.map((w) => {
              const Icon = w.icon;
              return (
                <Card
                  key={w.key}
                  className={`p-5 shadow-card border ${w.color.border} ${w.color.bg} transition-all`}
                >
                  {loading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background/60`}
                        >
                          <Icon className={`h-4 w-4 ${w.color.icon}`} />
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${w.color.badge}`}
                        >
                          {w.count} txn{w.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <div>
                        <p className="font-display text-lg font-bold text-foreground">
                          {formatCurrency(w.total)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {w.label}
                        </p>
                      </div>

                      {/* Mini status breakdown */}
                      {w.count > 0 && (
                        <div className="space-y-1">
                          {(["paid", "pending", "overdue"] as const).map(
                            (status) => {
                              const cnt = w.payments.filter(
                                (p) => p.status === status,
                              ).length;
                              if (cnt === 0) return null;
                              return (
                                <div
                                  key={status}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="capitalize text-muted-foreground">
                                    {status}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {cnt}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}

                      {w.count === 0 && (
                        <p className="text-xs text-muted-foreground/60 italic">
                          No payments in this window
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── All Payments History ── */}
        <Card className="p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="space-y-0.5">
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                All Payments History
              </h2>
              <p className="text-xs text-muted-foreground">
                {filtered.length} of {payments.length} records —{" "}
                <span className="font-medium text-foreground">
                  source of truth, never deleted
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendor, stall, receipt..."
                  className="pl-9"
                  disabled={loading}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {(filterStatus !== "all" ||
                  filterMethod !== "all" ||
                  filterVendor !== "all") && (
                  <span className="ml-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={exportCSV}
                disabled={loading || filtered.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-4">
              <div className="w-full sm:w-40">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-44">
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="maya">Maya</SelectItem>
                    <SelectItem value="cliqq">Cliqq</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-52">
                <Select value={filterVendor} onValueChange={setFilterVendor}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.userId} value={v.userId}>
                        {v.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-40">
                <Select
                  value={sortDir}
                  onValueChange={(v) => setSortDir(v as "desc" | "asc")}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterMethod("all");
                  setFilterVendor("all");
                  setSortDir("desc");
                  setSearch("");
                }}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No payments match your current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Stall</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.paymentDate
                            ? new Date(p.paymentDate).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium max-w-[140px] truncate">
                          {p.vendorName}
                        </TableCell>
                        <TableCell>{p.stallNumber ?? "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.periodMonth && p.periodYear
                            ? `${MONTHS[p.periodMonth - 1]} ${p.periodYear}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(p.amount || 0))}
                        </TableCell>
                        <TableCell>
                          <PaymentMethodBadge method={p.paymentMethod} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              STATUS_STYLES[p.status] ?? STATUS_STYLES.pending
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.receiptNumber || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing{" "}
                  {Math.min((page - 1) * ROWS_PER_PAGE + 1, filtered.length)}–
                  {Math.min(page * ROWS_PER_PAGE, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) {
                      p = i + 1;
                    } else if (page <= 3) {
                      p = i + 1;
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i;
                    } else {
                      p = page - 2 + i;
                    }
                    return (
                      <Button
                        key={p}
                        variant={page === p ? "default" : "outline"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Add Payment Modal ── */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setForm(INITIAL_FORM);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Payment (Manual / Face-to-Face)
            </DialogTitle>
            <DialogDescription>
              Record a payment collected in person. It will be permanently stored
              and appear across all reports.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="ap-vendor">Vendor *</Label>
              <Select
                value={form.vendorId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, vendorId: v, stallId: "" }))
                }
              >
                <SelectTrigger id="ap-vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.userId} value={v.userId}>
                      {v.fullName}
                      {v.businessName ? ` — ${v.businessName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stall */}
            <div className="space-y-2">
              <Label htmlFor="ap-stall">Stall *</Label>
              <Select
                value={form.stallId}
                onValueChange={(v) => setForm((f) => ({ ...f, stallId: v }))}
                disabled={!form.vendorId}
              >
                <SelectTrigger id="ap-stall">
                  <SelectValue
                    placeholder={
                      form.vendorId
                        ? "Select stall"
                        : "Select vendor first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vendorStalls.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No stalls found
                    </SelectItem>
                  ) : (
                    vendorStalls.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Stall {s.stall_number}
                        {s.location ? ` — ${s.location}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="ap-amount">Amount (₱) *</Label>
              <Input
                id="ap-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Payment mode: <span className="font-medium text-foreground">Cash</span> (auto)
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="ap-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: "paid" | "pending" | "overdue") =>
                  setForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger id="ap-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ap-month">Month</Label>
                <Select
                  value={String(form.periodMonth)}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, periodMonth: Number(v) }))
                  }
                >
                  <SelectTrigger id="ap-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-year">Year</Label>
                <Input
                  id="ap-year"
                  type="number"
                  value={form.periodYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, periodYear: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-date">Payment Date</Label>
                <Input
                  id="ap-date"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Receipt + Notes are system generated / not collected in Admin mode */}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                setForm(INITIAL_FORM);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
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
                  <CheckCircle className="h-4 w-4" />
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