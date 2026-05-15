import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Download,
  Search,
  TrendingUp,
  Clock,
  CreditCard,
} from "lucide-react";

// ✅ FIX: static import instead of dynamic await import()
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { adminService } from "@/services/adminService";
import { announcementService } from "@/services/announcementService";
import { paymentService } from "@/services/paymentService";
import type {
  AdminOverviewStats,
  AnnouncementRow,
  DashboardRecentPayment,
  PaymentReportRow,
} from "@/types/domain";

type PeriodPreset = "daily" | "monthly" | "yearly" | "all";

type RecentTx = DashboardRecentPayment & {
  receiptNumber?: string;
};

function formatMoney(value: number) {
  return `₱${Number(value || 0).toLocaleString()}`;
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);

    // RFC4180-ish: quote field if it contains special characters
    const needsQuotes = /[\r\n,\t"]/ .test(s);
    if (!needsQuotes) return s;

    // Escape quotes by doubling them
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [overview, setOverview] = useState<AdminOverviewStats>({
    activeVendors: 0,
    availableStalls: 0,
    maintenanceStalls: 0,
    occupancyPct: 0,
    occupiedStalls: 0,
    totalCollected: 0,
    totalOverdue: 0,
    totalPayments: 0,
    totalPending: 0,
    totalStalls: 0,
  });

  const [recentPayments, setRecentPayments] = useState<RecentTx[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] =
    useState<AnnouncementRow[]>([]);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("monthly");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [paymentReport, setPaymentReport] = useState<PaymentReportRow[]>([]);
  const [search, setSearch] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [ov, anns, recent] = await Promise.all([
        adminService.getOverview(),
        announcementService.listAnnouncements(6),
        paymentService.listRecentPayments(8),
      ]);

      setOverview(ov);
      setRecentAnnouncements(anns);
      setRecentPayments(recent as RecentTx[]);

      const { data, error } = await supabase.rpc("fn_payment_reports", {
        _month: null,
        _period: periodPreset,
        _year: year,
      });

      if (error) throw error;

      const rowsRaw = (data ?? []) as unknown[];

      const rows = rowsRaw.map((r: Record<string, unknown>): PaymentReportRow => ({
        collected: Number(r.collected ?? 0),
        occupancyPct: Number(r.occupancy_pct ?? r.occupancyPct ?? 0),
        overdue: Number(r.overdue ?? 0),
        pending: Number(r.pending ?? 0),
        periodLabel: String(r.period_label ?? r.periodLabel ?? "-"),
        periodMonth: Number(r.period_month ?? r.periodMonth ?? 0),
        periodYear: Number(r.period_year ?? r.periodYear ?? 0),
        totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
        totalTransactions: Number(
          r.total_transactions ?? r.totalTransactions ?? 0,
        ),
      }));

      setPaymentReport(rows);
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to load admin reports.",
      );
    } finally {
      setLoading(false);
    }
  }, [periodPreset, year]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useRealtimeRefresh({
    channelName: "admin-reports-payments",
    onRefresh: loadReports,
    table: "payments",
  });
  useRealtimeRefresh({
    channelName: "admin-reports-announcements",
    onRefresh: loadReports,
    table: "announcements",
  });
  useRealtimeRefresh({
    channelName: "admin-reports-stalls",
    onRefresh: loadReports,
    table: "stalls",
  });
  useRealtimeRefresh({
    channelName: "admin-reports-profiles",
    onRefresh: loadReports,
    table: "profiles",
  });

  const filteredRecentPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentPayments;

    return recentPayments.filter((p) => {
      const vendor = p.vendorName?.toLowerCase() ?? "";
      const stall = p.stallNumber?.toLowerCase() ?? "";
      const method = p.paymentMethod?.toLowerCase() ?? "";
      return vendor.includes(q) || stall.includes(q) || method.includes(q);
    });
  }, [recentPayments, search]);

  const statCards = useMemo(
    () =>
      [
        {
          label: "Total Collected",
          value: formatMoney(overview.totalCollected),
          icon: TrendingUp,
          color: "text-primary",
        },
        {
          label: "Pending",
          value: formatMoney(overview.totalPending),
          icon: Clock,
          color: "text-secondary",
        },
        {
          label: "Overdue",
          value: formatMoney(overview.totalOverdue),
          icon: AlertTriangle,
          color: "text-destructive",
        },
        {
          label: "Total Payments",
          value: String(overview.totalPayments),
          icon: BarChart3,
          color: "text-primary",
        },
      ] as const,
    [overview],
  );

  const exportRecent = () => {
    downloadCSV(
      `admin-recent-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredRecentPayments.map((p) => ({
        id: p.id,
        vendorName: p.vendorName,
        stallNumber: p.stallNumber,
        paymentMethod: p.paymentMethod,
        periodLabel: p.periodLabel,
        paymentDate: p.paymentDate,
        amount: p.amount,
        status: p.status,
        receiptNumber: p.receiptNumber,
      })),
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Admin Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Analytics, statistics, tables, charts, and summaries (admin-only).
            </p>
          </div>
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.label} className="p-4 shadow-card">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-start gap-3">
                  <card.icon className={`h-5 w-5 ${card.color} mt-1`} />
                  <div>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Recent Transactions
              </h2>
              <p className="text-sm text-muted-foreground">
                Search and export the latest payment activity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendor, stall, or method..."
                  className="pl-9"
                  disabled={loading}
                />
              </div>
              <Button onClick={exportRecent} variant="outline" disabled={loading}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredRecentPayments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
                No transactions found.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Stall</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecentPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.vendorName}</TableCell>
                        <TableCell>{p.stallNumber}</TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell>{p.periodLabel}</TableCell>
                        <TableCell>
                          {p.paymentDate
                            ? new Date(p.paymentDate).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(p.amount)}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted/40">
                            {p.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="font-display font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payment Summary
                </h2>
                <p className="text-sm text-muted-foreground">
                  Monthly/yearly totals from backend aggregation.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-44">
                <Input
                  type="number"
                  value={year}
                  onChange={(e) =>
                    setYear(Number(e.target.value) || new Date().getFullYear())
                  }
                  disabled={loading}
                  aria-label="Year"
                />
              </div>
              <div className="w-full sm:flex-1">
                <select
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={periodPreset}
                  onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                  disabled={loading}
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : paymentReport.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
                  No report rows available.
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Overdue</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Occupancy %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentReport.map((r) => (
                        <TableRow
                          key={`${r.periodYear}-${r.periodMonth}-${r.periodLabel}`}
                        >
                          <TableCell className="font-medium">{r.periodLabel}</TableCell>
                          <TableCell className="text-right">{formatMoney(r.totalAmount)}</TableCell>
                          <TableCell className="text-right">{r.totalTransactions}</TableCell>
                          <TableCell className="text-right">{formatMoney(r.pending)}</TableCell>
                          <TableCell className="text-right">{formatMoney(r.overdue)}</TableCell>
                          <TableCell className="text-right">{formatMoney(r.collected)}</TableCell>
                          <TableCell className="text-right">{r.occupancyPct}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <div>
                <h2 className="font-display font-semibold">Admin Announcements</h2>
                <p className="text-sm text-muted-foreground">
                  Latest announcements for vendors/staff.
                </p>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : recentAnnouncements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
                  No announcements available.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAnnouncements.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-sm">{a.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {a.created_at
                            ? new Date(a.created_at).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{a.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

