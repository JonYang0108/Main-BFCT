import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Store,
  CreditCard,

  Bell,
  Megaphone,
  AlertCircle,
  CheckCircle2,
  Clock,

  TrendingUp,
  MessageSquarePlus,
  Wifi,
  RefreshCw,
  RotateCcw,
  Loader2,
  Send,
  Shield,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { cn } from "@/lib/utils";
import { conversationNotificationService } from "@/services/conversationNotificationService";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import {
  VendorEmptyState,
  VendorGlassCard,
  VendorSkeletonBlock,
} from "@/components/dashboard/vendor/VendorDesignSystem";


/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

export interface Stall {
  id: string;
  vendor_id: string;
  stall_number: string;
  status: string;
  monthly_rent: number;
  location: string;
  size: string;
  notes: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  stall_id: string;
  vendor_id: string;
  amount: number;
  period_month: number;
  period_year: number;
  status: "paid" | "partial" | "unpaid" | "overdue";
  notes: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  vendor_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "alert" | "system";
  is_read: boolean;
  created_at: string;
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

const MONTHS = [
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

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const notifColors: Record<string, string> = {
  alert: "text-destructive bg-destructive/10",
  warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  info: "text-primary bg-primary/10",
  system: "text-muted-foreground bg-muted/40",
};

type Accent = "default" | "success" | "warning" | "danger";

function accentClasses(accent: Accent) {
  switch (accent) {
    case "success":
      return {
        text: "text-emerald-600 dark:text-emerald-400",
      };
    case "warning":
      return {
        text: "text-amber-600 dark:text-amber-400",
      };
    case "danger":
      return {
        text: "text-destructive",
      };
    default:
      return {
        text: "text-primary",
      };
  }
}

function OverviewStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "default",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: Accent;
  loading?: boolean;
}) {
  const accentCfg = accentClasses(accent);

  return (
    <Card
      className={cn(
        "h-full p-6 shadow-card transition-all",
        "hover:shadow-elevated hover:-translate-y-[0.5px]"
      )}
    >
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-28 rounded bg-muted/60" />
          <div className="h-8 w-20 rounded bg-muted/60" />
          <div className="h-3 w-40 rounded bg-muted/40" />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <div className={cn("rounded-lg p-2 bg-muted/30", accentCfg.text)}>
              <Icon className="h-4 w-4" />
            </div>
          </div>

          <div className={cn("mt-3 text-2xl font-bold tracking-tight", accentCfg.text)}>
            {value}
          </div>
          {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      )}
    </Card>
  );
}

function PaymentsLineChart({
  data,
  loading,
}: {
  data: { name: string; value: number }[];
  loading: boolean;
}) {
  return (
    <div className="h-72 w-full">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <VendorSkeletonBlock />
          <VendorSkeletonBlock className="h-64" />
        </div>
      ) : data.length === 0 ? (
        <VendorEmptyState
          title="No payment activity yet"
          description="Once a payment is recorded, the chart will appear here."
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => String(Math.round(v))} />
            <Tooltip formatter={(v) => formatPHP(Number(v))} labelFormatter={() => ""} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function StatusPill({
  value,
}: {
  value: "active" | "inactive" | string;
}) {
  return (
    <Badge
      variant={value === "active" ? "default" : "secondary"}
      className="capitalize shrink-0"
    >
      {value}
    </Badge>
  );
}

function RecentPaymentsList({
  payments,
  stalls,
  loading,
  onViewAll,
}: {
  payments: Payment[];
  stalls: Stall[];
  loading: boolean;
  onViewAll: () => void;
}) {
  const statusMap: Record<
    Payment["status"],
    { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    paid: {
      label: "Paid",
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40",
      icon: CheckCircle2,
    },
    partial: {
      label: "Partial",
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40",
      icon: Clock,
    },
    overdue: {
      label: "Overdue",
      cls: "bg-destructive/10 text-destructive",
      icon: AlertCircle,
    },
    unpaid: {
      label: "Unpaid",
      cls: "bg-muted text-muted-foreground",
      icon: Clock,
    },
  };

  return (
    <Card className="p-6 shadow-card h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-secondary" />
          Recent Payments
        </h2>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" ref="/src/pages/vendor/VendorPayments.tsx" onClick={onViewAll}>
          View All
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No payment records found.
        </div>
      ) : (
        <div className="space-y-2">
          {Array.isArray(payments) && payments.length > 0 ? (
            payments.map((p) => {
              const stall = stalls.find((s) => s.id === p.stall_id);

              const defaultStatusCfg = {
                label: "Unknown",
                cls: "bg-muted text-muted-foreground",
                icon: Clock,
              };

              // Defensive lookup: API may send unexpected/undefined status.
              const cfg = statusMap?.[p.status] ?? defaultStatusCfg;
              const StatusIcon = cfg?.icon ?? Clock;

              const monthIdx = typeof p?.period_month === "number" ? p.period_month - 1 : NaN;
              const monthLabel = MONTHS?.[monthIdx] ?? "—";

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        Stall {stall?.stall_number ?? "—"} · {monthLabel} {p.period_year ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-semibold text-sm">{formatPHP(Number(p.amount ?? 0))}</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium", cfg.cls)}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>
      )}
    </Card>
  );
}

const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stalls, setStalls] = useState<Stall[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [concernOpen, setConcernOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const [concernTitle, setConcernTitle] = useState("");
  const [concernMessage, setConcernMessage] = useState("");
  const [concernSubmitting, setConcernSubmitting] = useState(false);
  const [concernError, setConcernError] = useState("");
  const [concernSuccess, setConcernSuccess] = useState("");


  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [stallsRes, paymentsRes, announcementsRes, notifsRes] = await Promise.all([
        supabase.from("stalls").select("*").eq("vendor_id", user.id),
        supabase
          .from("payments")
          .select("*")
          .eq("vendor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (stallsRes.data) setStalls(stallsRes.data as Stall[]);
      if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);

      if (announcementsRes.data) {
        type AnnouncementRow = {
          id: string;
          title: string;
          content: string;
          created_at: string;
          status: string | null;
          type: string | null;
        };

        setAnnouncements(
          (announcementsRes.data as AnnouncementRow[]).map((a) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            created_at: a.created_at,
            is_important:
              a.status === "urgent" || a.type === "urgent" || a.status === "warning" || a.type === "warning",
          }))
        );
      }

      if (notifsRes.data) {
        type NotificationRow = {
          id: string;
          vendor_id: string | null;
          title: string;
          message: string;
          type: Notification["type"];
          is_read: boolean;
          created_at: string;
        };

        setNotifications(
          (notifsRes.data as unknown as NotificationRow[]).map((n) => ({
            id: n.id,
            vendor_id: n.vendor_id ?? user.id,
            title: n.title,
            message: n.message,
            type: n.type,
            is_read: n.is_read,
            created_at: n.created_at,
          }))
        );
      }
    } catch (err) {
      console.error("[VendorDashboard] fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`vendor-dashboard-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `vendor_id=eq.${user.id}`,
        },
        () => {
          void fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `vendor_id=eq.${user.id}` },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stalls", filter: `vendor_id=eq.${user.id}` },
        () => void fetchData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => void fetchData()
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const vendorName = user?.user_metadata?.full_name ?? "Vendor";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [nowStr, setNowStr] = useState(() => {
    const d = new Date();
    return `${d.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })} · ${d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNowStr(
        `${d.toLocaleDateString("en-PH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })} · ${d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`
      );
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const activeStall = stalls[0];

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();

    const totalPastDue = stalls.reduce((sum, s) => sum + (s.balance ?? 0), 0);

    const paidThisMonth = payments.filter(
      (p) => p.period_month === thisMonth && p.period_year === thisYear && p.status === "paid"
    ).length;

    const unpaidPaidCountThisMonth = payments.filter(
      (p) => p.period_month === thisMonth && p.period_year === thisYear
    ).length;

    const unreadNotifs = notifications.filter((n) => !n.is_read).length;
    const importantAnnouncements = announcements.filter((a) => a.is_important).length;

    // Past due + balance due are using stall balances from existing data.
    const balanceDue = stalls.reduce((sum, s) => sum + (s.balance ?? 0), 0);

    return {
      totalPastDue,
      paidThisMonth,
      unpaidPaidCountThisMonth,
      unreadNotifs,
      importantAnnouncements,
      balanceDue,
    };
  }, [stalls, payments, announcements, notifications]);

  const recentPayments = payments.slice(0, 3);
  const panelNotifs = notifications.slice(0, 12);


  const paymentsByPeriodLineData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      const key = `${p.period_year}-${p.period_month}`;
      if (!map.has(key)) map.set(key, 0);
      if (p.status === "paid" || p.status === "partial") {
        map.set(key, (map.get(key) ?? 0) + (p.amount ?? 0));
      }
    }

    const entries = Array.from(map.entries())
      .map(([k, v]) => {
        const [y, m] = k.split("-").map(Number);
        return { year: y, month: m, value: v };
      })
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
      .slice(-6);

    return entries.map((b) => ({ name: MONTHS[b.month - 1] ?? String(b.month), value: b.value }));
  }, [payments]);

  const hasBalanceDue = activeStall && (activeStall.balance ?? 0) > 0;

  const handleSubmitConcern = async () => {
    setConcernError("");
    setConcernSuccess("");

    if (!user) return;

    const content = concernMessage.trim();
    const title = concernTitle.trim();

    if (!content) {
      setConcernError("Please write your concern message.");
      return;
    }

    setConcernSubmitting(true);
    try {
      await conversationNotificationService.createConversationWithFirstMessage({
        vendorId: user.id,
        title: title || undefined,
        content,
      });

      setConcernSuccess("Concern sent. We’ll get back to you soon.");
      setConcernTitle("");
      setConcernMessage("");
      setConcernOpen(false);

      // Ensure the dashboard updates with the latest notifications/conversations.
      void fetchData();
    } catch (err: unknown) {
      setConcernError(err instanceof Error ? err.message : "Failed to send concern. Please try again.");
    } finally {
      setConcernSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Dialog open={concernOpen} onOpenChange={setConcernOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              Send Concern
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {concernError ? (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {concernError}
              </div>
            ) : null}

            {concernSuccess ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
                {concernSuccess}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="concern-title" className="text-xs font-semibold text-muted-foreground">
                Title <span className="font-normal text-muted-foreground/80">(optional)</span>
              </Label>
              <input
                id="concern-title"
                value={concernTitle}
                onChange={(e) => setConcernTitle(e.target.value)}
                placeholder="e.g. Payment clarification"
                className="h-10 w-full rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring/30 focus-visible:border-ring px-3 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concern-message" className="text-xs font-semibold text-muted-foreground">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="concern-message"
                value={concernMessage}
                onChange={(e) => setConcernMessage(e.target.value)}
                placeholder="Write your concern for the admin/staff..."
                className="min-h-[130px] resize-none bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring/30 focus-visible:border-ring rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-muted-foreground/80">
                <Shield className="inline h-3.5 w-3.5 mr-1" />
                Your concern is sent securely.
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConcernOpen(false);
                    setConcernError("");
                    setConcernSuccess("");
                  }}
                  disabled={concernSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={() => void handleSubmitConcern()}
                  disabled={concernSubmitting}
                  className="gap-2"
                >
                  {concernSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {concernSubmitting ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 pb-10">

        {/* Top section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-foreground truncate">
              {greeting}, {vendorName.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground break-words">{nowStr}</p>
          </div>


          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9"
              onClick={() => setConcernOpen(true)}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Send Concern
            </Button>



            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => void fetchData()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>

            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[10px] font-medium text-emerald-600">
                <Wifi className="h-2.5 w-2.5" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Main overview cards (2-row responsive layout) */}
        <div className="grid grid-cols-1 gap-3">
          {/* Row 1: My Stall */}
          <div>
            <Card className="p-4 shadow-card transition-all hover:shadow-elevated">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">My Stall</p>
                  <h2 className="font-display font-semibold text-foreground mt-1">
                    {activeStall ? `Stall ${activeStall.stall_number}` : "No stall assigned"}
                  </h2>
                </div>
                <div className="rounded-lg p-2 bg-muted/30 shrink-0">
                  <Store className="h-4 w-4 text-primary" />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-2/3 rounded bg-muted/40" />
                  <div className="h-4 w-1/2 rounded bg-muted/40" />
                  <div className="h-10 w-full rounded bg-muted/30" />
                  <div className="h-8 w-full rounded bg-muted/30" />
                </div>
              ) : activeStall ? (
                <>
                  {/* Key Info Grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Monthly Rent</p>
                      <p className="text-sm font-semibold">{formatPHP(activeStall.monthly_rent)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Balance Due</p>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          (activeStall.balance ?? 0) > 0 ? "text-destructive" : "text-emerald-600"
                        )}
                      >
                        {formatPHP(activeStall.balance ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <StatusPill value={activeStall.status} />
                  </div>

                  {/* Additional Details */}
                  {activeStall && (
                    <div className="mt-4 rounded-lg border bg-muted/10 p-3">
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Location</p>
                          <p className="text-xs font-semibold truncate">{activeStall.location}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">Size</p>
                          <p className="text-xs font-semibold truncate">{activeStall.size}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action: Pay Now Button (only if balance due) */}
                  {hasBalanceDue && (
                    <Button
                      className="w-full mt-4 gap-2"
                      onClick={() => navigate("/vendor/payments", { state: { stallId: activeStall.id } })}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay Now
                    </Button>
                  )}

                  {/* No Balance Due Message */}
                  {!hasBalanceDue && (
                    <div className="mt-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 p-3 text-center">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        ✓ No balance due right now
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed bg-muted/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Contact the admin to get your stall assigned.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Row 2: Paid / Past Due / Balance Due (equal size, compact) */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
              <OverviewStatCard
                icon={CreditCard}
                label="Paid This Month"
                value={stats.paidThisMonth}
                sub={payments.length ? "Payments recorded" : "No payments yet"}
                accent="success"
                loading={loading}
              />

              <OverviewStatCard
                icon={AlertCircle}
                label="Past Due"
                value={formatPHP(stats.totalPastDue)}
                sub={stats.totalPastDue > 0 ? "Settle to avoid penalties" : "All clear"}
                accent={stats.totalPastDue > 0 ? "danger" : "success"}
                loading={loading}
              />

              <OverviewStatCard
                icon={RotateCcw}
                label="Balance Due"
                value={formatPHP(stats.balanceDue)}
                sub={stats.balanceDue > 0 ? "Due on your active stall" : "Nothing pending"}
                accent={stats.balanceDue > 0 ? "warning" : "success"}
                loading={loading}
              />
            </div>
          </div>
        </div>


        {/* Info Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <Card className="p-6 shadow-card h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                Announcements
              </h2>
            </div>


            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
                ))
              ) : announcements.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No announcements.</p>
              ) : (
                announcements.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "rounded-lg border p-3",
                      a.is_important
                        ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20"
                        : "bg-muted/10"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {a.is_important ? (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold line-clamp-1">{a.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{a.content}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 shadow-card h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
                {stats.unreadNotifs > 0 ? (
                  <span className="ml-2 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                    {stats.unreadNotifs}
                  </span>
                ) : null}
              </h2>
            </div>

            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2">

              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                ))
              ) : panelNotifs.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center">
                  <Bell className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">No notifications</p>
                </div>
              ) : (
                panelNotifs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void markNotifRead(n.id)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/30",
                      !n.is_read ? "bg-primary/5 border-primary/20" : "bg-muted/10"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          notifColors[n.type] ?? notifColors.system
                        )}
                      >
                        {n.type}
                      </span>
                      {!n.is_read ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                    </div>
                    <p className="mt-1.5 text-xs font-medium line-clamp-1">{n.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-1">
            <RecentPaymentsList
              payments={payments.slice(0, 5)}
              stalls={stalls}
              loading={loading}
              onViewAll={() => navigate("/vendor/payments")}
            />
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 shadow-card h-full">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Analytics</p>
                  <h2 className="font-display font-semibold text-foreground">Payments By Period</h2>
                </div>
                <Badge variant="outline" className="text-xs">Last 6 periods</Badge>
              </div>

              <PaymentsLineChart data={paymentsByPeriodLineData} loading={loading} />
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VendorDashboard;