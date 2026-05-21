import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Receipt,
  Search,
  Send,
  Shield,
  Bell,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Stall, Payment } from "@/pages/dashboard/VendorDashboard";

const tableHeaderCls = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";
const tableCellMutedCls = "text-sm text-muted-foreground";
const tableRowCls = "grid grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_1.1fr_0.6fr_0.4fr] gap-2 items-center px-3 py-3 rounded-xl hover:bg-muted/30 transition-colors";


/* ─────────────────────────────────────────
   PAYMENT METHOD CONFIG
───────────────────────────────────────── */

const EWALLET_OPTIONS = [
  { key: "gcash", label: "GCash" },
  { key: "maya", label: "Maya" },
  { key: "cliqq", label: "Cliqq" },
] as const;

const BANK_OPTIONS = [
  { key: "bdo", label: "BDO" },
  { key: "mlhullier", label: "MLhullier" },
  { key: "cebuana", label: "Cebuana" },
  { key: "bpi", label: "BPI" },
  { key: "metrobank", label: "Metrobank" },
  { key: "landbank", label: "Landbank" },
  { key: "unionbank", label: "UnionBank" },
] as const;

type VendorPaymentMethod =
  | "gcash" | "maya" | "cliqq"
  | "bdo" | "mlhullier" | "cebuana" | "bpi" | "metrobank" | "landbank" | "unionbank"
  | "bank_transfer";

const METHOD_META: Record<string, { label: string; sublabel: string; color: string }> = {
  gcash:        { label: "GCash",       sublabel: "E-Wallet",      color: "bg-blue-500" },
  maya:         { label: "Maya",        sublabel: "E-Wallet",      color: "bg-green-500" },
  cliqq:        { label: "Cliqq",       sublabel: "E-Wallet",      color: "bg-orange-500" },
  bdo:          { label: "BDO",         sublabel: "Bank Transfer",  color: "bg-red-600" },
  mlhullier:    { label: "MLhullier",   sublabel: "Bank Transfer",  color: "bg-yellow-500" },
  cebuana:      { label: "Cebuana",     sublabel: "Bank Transfer",  color: "bg-pink-500" },
  bpi:          { label: "BPI",         sublabel: "Bank Transfer",  color: "bg-red-500" },
  metrobank:    { label: "Metrobank",   sublabel: "Bank Transfer",  color: "bg-blue-700" },
  landbank:     { label: "Landbank",    sublabel: "Bank Transfer",  color: "bg-green-700" },
  unionbank:    { label: "UnionBank",   sublabel: "Bank Transfer",  color: "bg-orange-600" },
  bank_transfer:{ label: "Bank Transfer",sublabel: "Bank Transfer", color: "bg-slate-500" },
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}
function fmtShort(amount: number) {
  return "₱" + new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
function getNextDueDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

const PAGE_SIZE = 8;

type PaymentWithMethod = Payment & { payment_method?: string | null };

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ iconBg, icon, label, value, sub, badge, badgeCls, glow }: {
  iconBg: string; icon: React.ReactNode; label: string; value: string;
  sub?: string; badge?: string; badgeCls?: string; glow?: string;
}) {
  return (
    <div className="relative rounded-2xl p-5 bg-card/70 border border-border/60 overflow-hidden flex flex-col gap-3">
      {glow && <div className="absolute inset-0 pointer-events-none opacity-25" style={{ background: glow }} />}
      <div className="flex items-start justify-between relative z-10">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>{icon}</div>
        {badge && <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", badgeCls)}>{badge}</span>}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground/80 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const VendorPayments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedStallId = (location.state as { stallId?: string } | null)?.stallId ?? "";

  const [stalls,    setStalls]    = useState<Stall[]>([]);
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [successMsg,setSuccessMsg]= useState("");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [searchQuery,setSearchQuery] = useState("");

  const now = new Date();
  const [selectedStallId, setSelectedStallId] = useState(preselectedStallId);
  const [amount,      setAmount]      = useState("");
  const [periodMonth, setPeriodMonth] = useState(String(now.getMonth() + 1));
  const [periodYear,  setPeriodYear]  = useState(String(now.getFullYear()));
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>("gcash");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [stallsRes, paymentsRes] = await Promise.all([
        supabase.from("stalls").select("*").eq("vendor_id", user.id),
        supabase.from("payments").select("*").eq("vendor_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (stallsRes.data)   setStalls(stallsRes.data as Stall[]);
      if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedStallId) return;
    const s = stalls.find((s) => s.id === selectedStallId);
    if (s && s.balance > 0) setAmount(String(s.balance));
  }, [selectedStallId, stalls]);

  const handleSubmit = async () => {
    setErrorMsg(""); setSuccessMsg("");
    const parsed = parseFloat(amount);
    if (!selectedStallId)           return setErrorMsg("Please select a stall.");
    if (!amount || isNaN(parsed) || parsed <= 0) return setErrorMsg("Enter a valid amount.");
    setSubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        stall_id: selectedStallId, vendor_id: user!.id,
        amount: parsed,
        payment_method: paymentMethod,
        period_month: parseInt(periodMonth),
        period_year: parseInt(periodYear),
        status: "paid",
        notes: null,
      });

      if (error) throw error;
      const stall = stalls.find((s) => s.id === selectedStallId);
      if (stall) {
        await supabase.from("stalls")
          .update({ balance: Math.max(0, (stall.balance ?? 0) - parsed) } as { balance: number })
          .eq("id", selectedStallId);
      }
      setSuccessMsg(`Payment of ${formatPHP(parsed)} recorded successfully!`);
      setAmount("");
      void fetchData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to record payment. Try again.");
    } finally { setSubmitting(false); }
  };

  /* ── Derived ── */
  const selectedStall  = stalls.find((s) => s.id === selectedStallId);
  const totalPastDue   = stalls.reduce((sum, s) => sum + (s.balance ?? 0), 0);
  const totalPaid      = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const paidThisMonth  = payments.filter((p) => p.status === "paid" && p.period_month === now.getMonth() + 1 && p.period_year === now.getFullYear()).reduce((s, p) => s + p.amount, 0);
  const paidThisMonthCount = payments.filter((p) => p.status === "paid" && p.period_month === now.getMonth() + 1 && p.period_year === now.getFullYear()).length;
  const primaryStall   = stalls[0];
  const years          = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const stall = stalls.find((s) => s.id === p.stall_id);
    const q = searchQuery.toLowerCase();
    return (
      stall?.stall_number?.toString().includes(q) ||
      MONTHS_SHORT[p.period_month - 1].toLowerCase().includes(q) ||
      String(p.period_year).includes(q) ||
      String(p.amount).includes(q) ||
      (p.notes ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages   = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const pagedPayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ─── shared input class ─── */
  const inputCls = "h-10 text-sm rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring/30 focus-visible:border-ring";
  const triggerCls = "h-10 text-sm rounded-xl bg-card border-border text-foreground focus:ring-ring/30 focus:border-ring [&>span]:text-foreground";
  const contentCls = "rounded-xl bg-card border-border text-foreground";

  // Smooth scrolling inside dropdowns/list content.
  // This affects the internal scrollable area of the SelectContent.
  const scrollSmoothCls = "scroll-smooth";

  const itemCls    = "rounded-lg focus:bg-muted/30 focus:text-foreground text-muted-foreground";

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background text-foreground">
        <div className="space-y-6 pb-10 p-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
<h1 className="text-2xl font-bold tracking-tight">Payments</h1>
<p className="text-sm text-muted-foreground mt-0.5">Manage and track your stall rent payments</p>
              </div>
            </div>
            {totalPaid > 0 && (
<div className="flex items-center gap-2.5 rounded-xl bg-muted/40 border border-border/60 px-4 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div>
<p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Paid</p>
                  <p className="text-sm font-bold text-emerald-400 tabular-nums leading-none">{fmtShort(totalPaid)}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              iconBg="bg-emerald-500/20"
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              label="Paid This Month"
              value={fmtShort(paidThisMonth)}
              sub={MONTHS_SHORT[now.getMonth()] + " " + now.getFullYear()}
              badge={paidThisMonthCount > 0 ? `${paidThisMonthCount} Payment${paidThisMonthCount !== 1 ? "s" : ""}` : undefined}
              badgeCls="bg-emerald-500/20 text-emerald-400"
              glow="radial-gradient(ellipse at top left, #22c55e30 0%, transparent 65%)"
            />
            <StatCard
              iconBg="bg-amber-500/20"
              icon={<Clock className="h-5 w-5 text-amber-400" />}
              label="Past Due"
              value={fmtShort(totalPastDue)}
              sub={totalPastDue === 0 ? "No overdue payments" : "Balance outstanding"}
              badge={totalPastDue === 0 ? "0 Payments" : undefined}
              badgeCls="bg-amber-500/20 text-amber-400"
              glow="radial-gradient(ellipse at top left, #f59e0b20 0%, transparent 65%)"
            />
            <StatCard
              iconBg="bg-red-500/20"
              icon={<AlertCircle className="h-5 w-5 text-red-400" />}
              label="Balance Due"
              value={fmtShort(totalPastDue)}
              sub={totalPastDue === 0 ? "All payments up to date" : "Needs attention"}
              glow="radial-gradient(ellipse at top left, #ef444420 0%, transparent 65%)"
            />
            <StatCard
              iconBg="bg-blue-500/20"
              icon={<CalendarDays className="h-5 w-5 text-blue-400" />}
              label="Next Due Date"
              value={getNextDueDate()}
              sub={primaryStall ? `Monthly Rent: ${fmtShort(primaryStall.monthly_rent)}` : "—"}
              glow="radial-gradient(ellipse at top left, #3b82f620 0%, transparent 65%)"
            />
          </div>

          {/* ── Main Grid ── */}
          <div className="grid lg:grid-cols-5 gap-5">

            {/* ── Payment Form ── */}
            <div className="lg:col-span-2 rounded-2xl bg-card/70 border border-border/60 p-6 h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
<h2 className="font-semibold text-sm leading-none">Make a Payment</h2>
<p className="text-[11px] text-muted-foreground mt-0.5">Record your stall rent payment</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Stall */}
                <div className="space-y-1.5">
<Label className="text-xs font-semibold text-muted-foreground">Select Stall</Label>
                  <Select value={selectedStallId} onValueChange={(v) => { setSelectedStallId(v); setSuccessMsg(""); setErrorMsg(""); }}>
                    <SelectTrigger className={triggerCls}><SelectValue placeholder="Select a stall…" /></SelectTrigger>
                    <SelectContent className={cn(contentCls, scrollSmoothCls)}>
                      {stalls.map((s) => (
                        <SelectItem key={s.id} value={s.id} className={itemCls}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span>Stall {s.stall_number}</span>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                              s.balance > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                            )}>
                              {s.balance > 0 ? "Occupied" : "Active"}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
<Label className="text-xs font-semibold text-muted-foreground">Month</Label>
                  <Select value={periodMonth} onValueChange={setPeriodMonth}>
                      <SelectTrigger className={triggerCls}>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className={cn(contentCls, scrollSmoothCls)}>
                        {MONTH_NAMES.map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)} className={itemCls}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
<Label className="text-xs font-semibold text-muted-foreground">Year</Label>
                    <Select value={periodYear} onValueChange={setPeriodYear}>
                      <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={contentCls}>
                        {years.map((y) => <SelectItem key={y} value={String(y)} className={itemCls}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
<Label className="text-xs font-semibold text-muted-foreground">Amount (PHP)</Label>
                  <div className="relative">
<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">₱</span>
                    <Input type="number" min="1" step="0.01" placeholder="0.00"
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                      className={cn(inputCls, "pl-8 font-medium tabular-nums")} />
                  </div>
                  {selectedStall && selectedStall.balance > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                      <span className="text-[11px] text-amber-400/80">Outstanding balance</span>
                      <button type="button" className="text-[11px] font-bold text-amber-400 hover:underline underline-offset-2"
                        onClick={() => setAmount(String(selectedStall.balance))}>
                        {fmtShort(selectedStall.balance)} →
                      </button>
                    </div>
                  )}
                </div>

                {/* Mode of Payment — grouped dropdown */}
                <div className="space-y-1.5">
<Label className="text-xs font-semibold text-muted-foreground">Mode of Payment</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as VendorPaymentMethod)}>
                    <SelectTrigger className={triggerCls}><SelectValue placeholder="Select payment method" /></SelectTrigger>
                    <SelectContent className={contentCls}>
                      <div className="px-2 pt-2 pb-1">
<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">E-Wallet</p>
                      </div>
                      {EWALLET_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key} className={cn(itemCls, "pl-4")}>{o.label}</SelectItem>)}
                      <div className="px-2 pt-3 pb-1 mt-1 border-t border-border/60">
                        <p className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-widest">Bank Transfer</p>
                      </div>
                      {BANK_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key} className={cn(itemCls, "pl-4")}>{o.label}</SelectItem>)}
                      <div className="px-2 pt-3 pb-1 mt-1 border-t border-border/60">
                        <p className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-widest">Other</p>
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                {/* Feedback */}
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{successMsg}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  disabled={submitting || !selectedStallId || !amount}
                  onClick={() => void handleSubmit()}
                  className={cn(
                    "w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150",
                    submitting || !selectedStallId || !amount
                      ? "bg-emerald-500/20 text-emerald-500/40 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20"
                  )}
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Recording…</>
                    : <><Send className="h-4 w-4" />Submit Payment</>
                  }
                </button>

<div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Your payment will be recorded securely
                </div>
              </div>
            </div>

            {/* ── Payment History + Reminders ── */}
            <div className="lg:col-span-3 flex flex-col gap-4">

              {/* History card */}
              <div className="rounded-2xl bg-card/70 border border-border/60 p-6">
<div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
                      <Receipt className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm leading-none text-foreground">Recent Payments</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Your latest stall rent payments</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      placeholder="Search payments..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="h-8 pl-8 pr-3 text-xs rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring w-44"
                    />
                  </div>
                </div>

                {loading ? (
<div className="space-y-2">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
                    ))}
                  </div>
                ) : filteredPayments.length === 0 ? (
<div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No payment records yet</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Your payment history will appear here</p>
                  </div>
                ) : (
                  <>
                    {/* Table header */}
<div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_1.1fr_0.6fr_0.4fr] gap-2 px-3 pb-2 mb-1 border-b border-border/60">
                      {["Date Paid","Stall","Period","Amount","Method","Status","Receipt"].map((h) => (
<p key={h} className={tableHeaderCls}>{h}</p>
                      ))}
                    </div>

                    {/* Rows */}
                    <div className="space-y-0.5">
                      {pagedPayments.map((p) => {
                        const pp = p as PaymentWithMethod;
                        const stall  = stalls.find((s) => s.id === pp.stall_id);
                        const method = METHOD_META[pp.payment_method ?? ""] ?? { label: pp.payment_method ?? "", sublabel: "", color: "bg-slate-500" };
                        const paid   = new Date(p.created_at);

                        return (
                          <div
                            key={p.id}
                            className={tableRowCls.replace(
                              "hover:bg-muted/30",
                              "hover:bg-muted/50",
                            )}
                          >
                            {/* Date */}
                            <div>
                              <p className="text-sm text-foreground font-medium tabular-nums leading-tight">
                                {paid.toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {paid.toLocaleTimeString("en-PH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>

                            {/* Stall */}
                            <p className="text-sm text-foreground font-medium">
                              {stall ? `Stall ${stall.stall_number}` : "—"}
                            </p>

                            {/* Period */}
                            <p className="text-sm text-muted-foreground">
                              {MONTHS_SHORT[p.period_month - 1]} {p.period_year}
                            </p>

                            {/* Amount */}
                            <p className="text-sm text-foreground font-bold tabular-nums">
                              {fmtShort(p.amount)}
                            </p>

                            {/* Method */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  "h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-white text-[9px] font-bold",
                                  method.color,
                                )}
                              >
                                {method.label.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-foreground font-medium truncate leading-tight">
                                  {method.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {method.sublabel}
                                </p>
                              </div>
                            </div>

                            {/* Status */}
                            <div>
                              {p.status === "paid" && (
                                <span className="text-xs font-bold text-emerald-400">Paid</span>
                              )}
                              {p.status === "partial" && (
                                <span className="text-xs font-bold text-amber-400">Partial</span>
                              )}
                              {p.status === "overdue" && (
                                <span className="text-xs font-bold text-red-400">Overdue</span>
                              )}
                              {p.status === "unpaid" && (
                                <span className="text-xs font-bold text-muted-foreground">Unpaid</span>
                              )}
                            </div>

                            {/* Receipt */}
                            <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-emerald-400 transition-colors">
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
<div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
<p className="text-xs text-muted-foreground">
                        Showing {Math.min((page-1)*PAGE_SIZE+1, filteredPayments.length)} to{" "}
                        {Math.min(page*PAGE_SIZE, filteredPayments.length)} of{" "}
                        {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-1.5">
                      <button disabled={page === 1} onClick={() => setPage((p) => p-1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 border border-border/60 text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i+1).map((n) => (
                          <button key={n} onClick={() => setPage(n)}
                            className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                              page === n
                                ? "bg-emerald-500 text-black shadow-sm shadow-emerald-500/30"
                                : "bg-muted/40 border border-border/60 text-muted-foreground hover:bg-muted/60"
                            )}>{n}</button>
                        ))}
                      <button disabled={page === totalPages} onClick={() => setPage((p) => p+1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 border border-border/60 text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Payment Reminders ── */}
              <div className="rounded-2xl bg-card/70 border border-border/60 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <Bell className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold">Payment Reminders</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "Please pay your monthly rent on or before the due date to avoid penalties.",
                    "Keep your receipts for reference and future transactions.",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VendorPayments;