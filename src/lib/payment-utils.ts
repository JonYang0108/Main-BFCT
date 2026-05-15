export type PaymentMethodDisplay = "bank-transfer" | "cash" | "e-wallet";

const paymentMethodAliases: Record<string, PaymentMethodDisplay> = {
  "bank transfer": "bank-transfer",
  bank: "bank-transfer",
  bank_transfer: "bank-transfer",
  "bank-transfer": "bank-transfer",
  cash: "cash",
  cliqq: "e-wallet",
  "e-wallet": "e-wallet",
  "e wallet": "e-wallet",
  ewallet: "e-wallet",
  f2f: "cash",
  face_to_face: "cash",
  gcash: "e-wallet",
  maya: "e-wallet",
};

export function normalizePaymentMethod(
  method?: string | null,
): PaymentMethodDisplay {
  if (!method) {
    return "cash";
  }

  return paymentMethodAliases[method.trim().toLowerCase()] ?? "cash";
}

export function getPaymentMethodLabel(method?: string | null): string {
  const normalizedMethod = normalizePaymentMethod(method);

  if (normalizedMethod === "bank-transfer") {
    return "Bank Transfer";
  }

  if (normalizedMethod === "e-wallet") {
    return "E-wallet";
  }

  return "Cash";
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    style: "currency",
  }).format(value);
}
