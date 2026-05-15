import { CalendarDays, CreditCard } from "lucide-react";

import PaymentMethodBadge from "@/components/payments/PaymentMethodBadge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/payment-utils";
import type { DashboardRecentPayment } from "@/types/domain";

interface RecentPaymentsListProps {
  emptyCopy?: string;
  items: DashboardRecentPayment[];
  loading?: boolean;
  title: string;
}

export default function RecentPaymentsList({
  emptyCopy = "No payments recorded yet.",
  items,
  loading = false,
  title,
}: RecentPaymentsListProps) {
  return (
    <Card className="p-6 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-foreground">
        <CreditCard className="h-4 w-4 text-primary" />
        {title}
      </h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
          {emptyCopy}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {payment.vendorName}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </span>
                  <span className="capitalize">{payment.status}</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(Number(payment.amount || 0))}
                </p>
                <PaymentMethodBadge method={payment.paymentMethod} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
