import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import {
  Store,
  CreditCard,
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* =========================
   TYPES (FIXED STALL TYPE)
========================= */

interface Stall {
  id: string;
  vendor_id: string;
  stall_number: string; // ✅ FIXED (was number)
  status: string;
  monthly_rent: number;
  location: string;
  size: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  amount: number;
  period_month: number;
  period_year: number;
  status: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

/* =========================
   NOTIFICATION CONFIG
========================= */

const typeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  alert: { icon: AlertTriangle, color: "text-destructive" },
  warning: { icon: Clock, color: "text-secondary" },
  system: { icon: Info, color: "text-primary" },
};

/* =========================
   COMPONENT
========================= */

const VendorDashboard = () => {
  const { user } = useAuth();

  const [stall, setStall] = useState<Stall | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: stallsData, error: stallsError } = await supabase
        .from("stalls")
        .select("*");

      if (stallsError) {
        console.error("[VendorDashboard] Failed to fetch stalls:", stallsError);
      }

      const vendorStall = (stallsData as Stall[] | null)?.find(
        (s: Stall) => s.vendor_id === user.id,
      );

      setStall(vendorStall ?? null);

      setPayments([]);
      setAnnouncements([]);
      setNotifications([]);
    };

    void fetchData();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Vendor Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            View your stall and payments
          </p>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="p-6 shadow-card border-l-4 border-l-primary">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </h2>

            <div className="space-y-3 max-h-48 overflow-y-auto">
              {notifications.slice(0, 5).map((n) => {
                const cfg = typeConfig[n.type] || typeConfig.system;
                const Icon = cfg.icon;

                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 rounded-lg border ${
                      n.is_read ? "bg-muted/30" : "bg-muted/60"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${cfg.color}`} />
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Stall Info */}
        <Card className="p-6 shadow-card">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            My Stall
          </h2>

          {stall ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Stall Number</p>
                <p className="font-semibold">{stall.stall_number}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {stall.status}
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold">₱{stall.monthly_rent}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stall assigned yet. Contact admin for stall assignment.
            </p>
          )}
        </Card>

        {/* Payments */}
        <Card className="p-6 shadow-card">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-secondary" />
            Payment History
          </h2>

          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments recorded.
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div>
                    <p className="font-medium">₱{p.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.period_month}/{p.period_year}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      p.status === "paid"
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorDashboard;
