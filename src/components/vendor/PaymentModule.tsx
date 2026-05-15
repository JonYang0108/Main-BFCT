import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle,
  CreditCard,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/payment-utils";
import { paymentService } from "@/services/paymentService";
import type { Tables } from "@/types/supabase";

type StallRow = Tables<"stalls">;

const paymentMethods = [
  { category: "E-wallet", id: "gcash", icon: Smartphone, label: "GCash" },
  { category: "E-wallet", id: "maya", icon: Smartphone, label: "Maya" },
  { category: "E-wallet", id: "cliqq", icon: Wallet, label: "Cliqq" },
  {
    category: "Bank Transfer",
    id: "bank_transfer",
    icon: Building2,
    label: "Bank Transfer",
  },
  { category: "Cash", id: "cash", icon: CreditCard, label: "Cash" },
] as const;

interface PaymentModuleProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  stall: StallRow | null;
}

interface ReceiptData {
  amount: number;
  date: string;
  method: string;
  period: string;
  receiptNumber: string;
  stallNumber: string;
  status: "Paid" | "Pending Verification";
}

export default function PaymentModule({
  onOpenChange,
  onSuccess,
  open,
  stall,
}: PaymentModuleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [step, setStep] = useState<"method" | "details" | "success">("method");

  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();
  const months = [
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

  useEffect(() => {
    setAmount(stall?.monthly_rent ? String(stall.monthly_rent) : "");
  }, [stall]);

  const resetForm = () => {
    setAmount(stall?.monthly_rent ? String(stall.monthly_rent) : "");
    setReceiptData(null);
    setReferenceNumber("");
    setSelectedMethod("");
    setStep("method");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmitPayment = async () => {
    if (!user || !stall) {
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast({
        description: "Please enter a valid payment amount.",
        title: "Invalid amount",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMethod) {
      toast({
        description: "Choose a payment method first.",
        title: "Missing payment method",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
      const paymentMethod = selectedMethod;
      const selectedMethodConfig = paymentMethods.find(
        (method) => method.id === selectedMethod,
      );
      const pendingVerification = paymentMethod === "cash";

      await paymentService.addPayment({
        amount: Number(amount),
        notes: referenceNumber.trim()
          ? `Reference: ${referenceNumber.trim()}`
          : null,
        paymentDate: new Date().toISOString(),
        paymentMethod,
        periodMonth,
        periodYear,
        receiptNumber,
        stallId: stall.id,
        status: pendingVerification ? "pending" : "paid",
        vendorId: user.id,
      });

      setReceiptData({
        amount: Number(amount),
        date: new Date().toLocaleString(),
        method: selectedMethodConfig?.label ?? selectedMethod,
        period: `${months[periodMonth - 1]} ${periodYear}`,
        receiptNumber,
        stallNumber: stall.stall_number,
        status: pendingVerification ? "Pending Verification" : "Paid",
      });
      setStep("success");
      onSuccess();
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Failed to submit payment.",
        title: "Payment failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "method" && "Choose Payment Method"}
            {step === "details" && "Payment Details"}
            {step === "success" && "Payment Recorded"}
          </DialogTitle>
          <DialogDescription>
            {step === "method" && "Select a payment method to continue."}
            {step === "details" && "Review the payment information before submitting."}
            {step === "success" && "Your payment has been recorded."}
          </DialogDescription>
        </DialogHeader>

        {step === "method" ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select how you would like to settle this payment.
            </p>

            <div className="space-y-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(method.id);
                      setStep("details");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary hover:bg-accent/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {method.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {method.category}
                      </p>
                    </div>

                    <Badge variant="outline" className="ml-auto text-xs">
                      {method.category}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Paying via</p>
              <p className="font-medium text-foreground">
                {
                  paymentMethods.find((method) => method.id === selectedMethod)
                    ?.label
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-payment-amount">Amount</Label>
              <Input
                id="vendor-payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="vendor-payment-period">Period</Label>
                <Input
                  id="vendor-payment-period"
                  value={`${months[periodMonth - 1]} ${periodYear}`}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-payment-stall">Stall</Label>
                <Input
                  id="vendor-payment-stall"
                  value={stall?.stall_number ?? ""}
                  disabled
                />
              </div>
            </div>

            {selectedMethod !== "cash" ? (
              <div className="space-y-2">
                <Label htmlFor="vendor-reference-number">
                  Reference Number
                </Label>
                <Input
                  id="vendor-reference-number"
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  placeholder="Enter the transaction reference"
                />
              </div>
            ) : null}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("method")}>
                Back
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={saving}
                className="bg-gradient-primary text-primary-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit Payment"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "success" && receiptData ? (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>

            <div>
              <p className="font-display text-lg font-bold text-foreground">
                Payment Recorded
              </p>
              <p className="text-sm text-muted-foreground">
                Receipt: {receiptData.receiptNumber}
              </p>
            </div>

            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    {formatCurrency(receiptData.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span>{receiptData.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span>{receiptData.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      receiptData.status === "Paid" ? "default" : "secondary"
                    }
                  >
                    {receiptData.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recorded</span>
                  <span>{receiptData.date}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-gradient-primary text-primary-foreground"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
