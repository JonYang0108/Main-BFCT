import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/supabase";


import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { useToast } from "@/hooks/use-toast";

import {
  Plus,
  Search,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";

type Payment = {
  id: string;
  vendor_id: string;
  stall_id: string;
  amount: number;
  period_month: number;
  period_year: number;
  status: string;
  payment_date: string;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
};

type NewPaymentInsert = Omit<
  Database["public"]["Tables"]["payments"]["Insert"],
  | "payment_method"
  | "payment_date"
  | "receipt_number"
  | "receipt_url"
  | "approved_by"
  | "approved_at"
  | "created_at"
> & {
  payment_method?: string | null;
  payment_date?: string;
  receipt_number?: string | null;
  receipt_url?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
};


type Profile = {
  user_id: string;
  full_name: string;
  business_name: string | null;
};

type Stall = {
  id: string;
  stall_number: string;
};

const statusColors: Record<string, string> = {
  paid: "bg-primary/10 text-primary",
  pending: "bg-secondary/10 text-secondary",
  overdue: "bg-destructive/10 text-destructive",
};

const AdminPayments = () => {
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Profile[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const now = new Date();

  const [form, setForm] = useState({
    vendor_id: "",
    stall_id: "",
    amount: "",
    period_month: String(now.getMonth() + 1),
    period_year: String(now.getFullYear()),
    status: "paid",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        { data: paymentsData, error: paymentsError },
        { data: vendorsData, error: vendorsError },
        { data: stallsData, error: stallsError },
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .order("payment_date", { ascending: false }),

        supabase.from("profiles").select("user_id, full_name, business_name"),

        supabase.from("stalls").select("id, stall_number"),
      ]);

      if (paymentsError) throw paymentsError;
      if (vendorsError) throw vendorsError;
      if (stallsError) throw stallsError;

      setPayments((paymentsData ?? []) as Payment[]);
      setVendors((vendorsData ?? []) as Profile[]);
      setStalls((stallsData ?? []) as Stall[]);

    } catch (error: unknown) {
      console.error(error);

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setForm({
      vendor_id: "",
      stall_id: "",
      amount: "",
      period_month: String(now.getMonth() + 1),
      period_year: String(now.getFullYear()),
      status: "paid",
      notes: "",
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendor_id || !form.stall_id || !form.amount) {

      toast({
        title: "Error",
        description: "Vendor, stall, and amount are required",
        variant: "destructive",
      });

      return;
    }

    setSaving(true);

    try {
      const insertPayload: NewPaymentInsert = {
        vendor_id: form.vendor_id,
        stall_id: form.stall_id,
        amount: Number(form.amount),
        period_month: Number(form.period_month),
        period_year: Number(form.period_year),
        status: form.status,
        notes: form.notes || null,
      };

      const { error } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (rows: unknown[]) => Promise<{ error: unknown }>;
        };
      }).from("payments").insert([insertPayload] as unknown[]);




      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setDialogOpen(false);

      fetchData();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save payment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await (supabase as unknown as {
        from: (table: string) => {
          update: (values: unknown) => {
            eq: (column: string, value: unknown) => Promise<{ error: unknown }>;
          };
        };
      })
        .from("payments")
        .update({
          status,
        })
        .eq("id", id);




      if (error) throw error;

      setPayments((prev) =>
        prev.map((payment) =>
          payment.id === id
            ? {
                ...payment,
                status,
              }
            : payment,
        ),
      );

      toast({
        title: "Success",
        description: "Payment status updated",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const vendorMap = Object.fromEntries(vendors.map((v) => [v.user_id, v]));

  const stallMap = Object.fromEntries(stalls.map((s) => [s.id, s]));

  const filtered = payments.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) {
      return false;
    }

    if (search) {
      const vendor = vendorMap[p.vendor_id];

      const q = search.toLowerCase();

      if (!vendor?.full_name.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  const totalCollected = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalOverdue = payments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const summaryCards = [
    {
      label: "Collected",
      value: `₱${totalCollected.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
    },

    {
      label: "Pending",
      value: `₱${totalPending.toLocaleString()}`,
      icon: Clock,
      color: "text-secondary",
    },

    {
      label: "Overdue",
      value: `₱${totalOverdue.toLocaleString()}`,
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Payment Tracking
            </h1>

            <p className="text-sm text-muted-foreground">
              Record and track vendor payments
            </p>
          </div>

          <Button
            onClick={openAdd}
            className="bg-gradient-primary text-primary-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <Card
              key={card.label}
              className="p-4 shadow-card flex items-center gap-3"
            >
              <card.icon className={`h-5 w-5 ${card.color}`} />

              <div>
                <p className="text-xl font-bold font-display text-foreground">
                  {card.value}
                </p>

                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
