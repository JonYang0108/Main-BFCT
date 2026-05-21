import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

type SectionCardProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ title, subtitle, icon: Icon, children, className }: SectionCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 bg-card/70 shadow-card backdrop-blur supports-[backdrop-filter]:bg-card/60",
        className,
      )}
    >
      {/** subtle glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="relative p-6">
        {title ? (
          <div className="mb-4">
            {Icon && (
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Icon className="h-4 w-4 text-primary" />
                <span>{title}</span>
              </div>
            )}
            {!Icon && <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</div>}
            {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </Card>
  );
}

type AnimatedCounterProps = {
  value: number;
  format?: (n: number) => string;
  className?: string;
};

export function AnimatedCounter({ value, format, className }: AnimatedCounterProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <span
        className={cn(
          "font-display tabular-nums text-2xl font-bold text-foreground",
          className,
        )}
      >
        {format ? format(value) : value}
      </span>
    );
  }

  // Production-safe: avoid number interpolation typing issues.
  // We animate only opacity/position while value is rendered as text.
  return (
    <motion.span
      className={cn(
        "font-display tabular-nums text-2xl font-bold text-foreground",
        className,
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {format ? format(value) : value}
    </motion.span>
  );
}




type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value?: string | number;
  sub?: string;
  loading?: boolean;
  trendPct?: number;
  accent?: "primary" | "emerald" | "amber" | "destructive" | "violet" | "sky";
};

const accentMap: Record<NonNullable<StatCardProps["accent"]>, { ring: string; icon: string; badge: string }> = {
  primary: { ring: "ring-primary/20", icon: "text-primary", badge: "bg-primary/10 text-primary border-primary/20" },
  emerald: { ring: "ring-emerald-500/20", icon: "text-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  amber: { ring: "ring-amber-500/20", icon: "text-amber-500", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  destructive: { ring: "ring-destructive/20", icon: "text-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20" },
  violet: { ring: "ring-violet-500/20", icon: "text-violet-500", badge: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  sky: { ring: "ring-sky-500/20", icon: "text-sky-500", badge: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
};

export function StatCard({ icon: Icon, label, value, sub, loading, trendPct, accent = "primary" }: StatCardProps) {
  const cfg = accentMap[accent];
  const trendPositive = typeof trendPct === "number" ? trendPct >= 0 : false;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-4 shadow-card transition-all",
        "hover:-translate-y-[1px] hover:shadow-lg",
        "bg-card/70 border-border/60 backdrop-blur supports-[backdrop-filter]:bg-card/60",
        cfg.ring,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/40">
              <Icon className={cn("h-4 w-4", cfg.icon)} />
            </div>
            {typeof trendPct === "number" ? (
              <Badge variant="outline" className={cn("px-2 py-1 text-[11px]", cfg.badge)}>
                {trendPositive ? "↑" : "↓"} {Math.abs(trendPct)}%
              </Badge>
            ) : null}
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-bold tabular-nums text-foreground">
              {value}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
            {sub ? <div className="mt-1 text-xs font-medium text-primary">{sub}</div> : null}
          </div>
        </div>
      )}
    </Card>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 px-6 py-10 text-center">
      {Icon ? (
        <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
      ) : null}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
    </div>
  );
}

