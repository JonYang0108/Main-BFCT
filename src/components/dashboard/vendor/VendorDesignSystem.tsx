import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useReducedMotion } from "framer-motion";

type Accent = "default" | "success" | "warning" | "danger";

const accentMap: Record<Accent, { text: string; bg: string; ring: string }> = {
  default: {
    text: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/15",
    ring: "ring-primary/20 dark:ring-primary/20",
  },
  success: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-600/10 dark:bg-emerald-400/10",
    ring: "ring-emerald-600/20 dark:ring-emerald-400/20",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
    ring: "ring-amber-500/20 dark:ring-amber-400/20",
  },
  danger: {
    text: "text-destructive dark:text-destructive",
    bg: "bg-destructive/10 dark:bg-destructive/15",
    ring: "ring-destructive/20 dark:ring-destructive/20",
  },
};

export function VendorGlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50",
        "shadow-card",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:via-transparent before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function VendorSectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  const Icon = icon;
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h2 className="font-display font-semibold text-foreground">{title}</h2>
        </div>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function VendorAnimatedCounter({
  value,
  format,
  durationMs = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  const formatted = useMemo(() => {
    const fn = format ?? ((n: number) => String(n));
    return fn(display);
  }, [display, format]);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const from = display;
    const to = value;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, reduced]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={className}
    >
      {formatted}
    </motion.span>
  );
}

export function VendorStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "default",
  loading,
  valueFormat,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  accent?: Accent;
  loading?: boolean;
  valueFormat?: (n: number | string) => string;
  valueClassName?: string;
}) {
  const cfg = accentMap[accent];

  return (
    <VendorGlassCard className="p-5">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-28 rounded bg-muted/60" />
          <div className="h-8 w-20 rounded bg-muted/60" />
          <div className="h-3 w-32 rounded bg-muted/40" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <div className={cn("rounded-lg p-2", cfg.bg, cfg.ring)}>
              <Icon className="h-4 w-4" />
            </div>
          </div>

          <div
            className={cn(
              "text-2xl font-bold tracking-tight",
              cfg.text,
              valueClassName,
            )}
          >
            {valueFormat ? valueFormat(value) : value}
          </div>

          {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      )}
    </VendorGlassCard>
  );
}

export function VendorSkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <Skeleton className={cn("h-20 w-full rounded-xl", className)} />;
}

export function VendorEmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/25 px-6 py-10 text-center">
      {Icon ? <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" /> : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      {actions ? <div className="mt-5">{actions}</div> : null}
    </div>
  );
}

