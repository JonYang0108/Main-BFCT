import { Building2, Wallet, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getPaymentMethodLabel,
  normalizePaymentMethod,
} from "@/lib/payment-utils";

interface PaymentMethodBadgeProps {
  className?: string;
  method?: string | null;
}

const paymentMethodStyles = {
  "bank-transfer": {
    icon: Building2,
    tone: "border-secondary/20 bg-secondary/10 text-secondary",
  },
  cash: {
    icon: WalletCards,
    tone: "border-primary/20 bg-primary/10 text-primary",
  },
  "e-wallet": {
    icon: Wallet,
    tone: "border-primary/20 bg-primary/10 text-primary",
  },
} as const;

export default function PaymentMethodBadge({
  className,
  method,
}: PaymentMethodBadgeProps) {
  const normalizedMethod = normalizePaymentMethod(method);
  const config = paymentMethodStyles[normalizedMethod];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={[config.tone, "inline-flex items-center gap-1.5", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="h-3 w-3" />
      {getPaymentMethodLabel(method)}
    </Badge>
  );
}
