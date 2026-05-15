import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CreditCard,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import EmailNotificationPanel from "@/components/admin/EmailNotificationPanel";
import DashboardLayout from "@/components/DashboardLayout";
import RecentPaymentsList from "@/components/payments/RecentPaymentsList";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { adminService } from "@/services/adminService";
import { announcementService } from "@/services/announcementService";
import { paymentService } from "@/services/paymentService";
import type {
  AdminOverviewStats,
  AnnouncementRow,
  DashboardRecentPayment,
} from "@/types/domain";

interface AdminDashboardState {
  announcements: AnnouncementRow[];
  overview: AdminOverviewStats;
  recentPayments: DashboardRecentPayment[];
}

const initialState: AdminDashboardState = {
  announcements: [],
  overview: {
    activeVendors: 0,
    availableStalls: 0,
    maintenanceStalls: 0,
    occupancyPct: 0,
    occupiedStalls: 0,
    totalCollected: 0,
    totalOverdue: 0,
    totalPayments: 0,
    totalPending: 0,
    totalStalls: 0,
  },
  recentPayments: [],
};

export default function AdminDashboard() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AdminDashboardState>(initialState);

  const loadDashboard = useCallback(async () => {
    try {
      setErrorMessage(null);

      const [overview, announcements, recentPayments] = await Promise.all([
        adminService.getOverview(),
        announcementService.listAnnouncements(3),
        paymentService.listRecentPayments(6),
      ]);

      setState({
        announcements,
        overview,
        recentPayments,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load admin dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useRealtimeRefresh({
    channelName: "admin-dashboard-payments",
    onRefresh: loadDashboard,
    table: "payments",
  });

  useRealtimeRefresh({
    channelName: "admin-dashboard-announcements",
    onRefresh: loadDashboard,
    table: "announcements",
  });

  useRealtimeRefresh({
    channelName: "admin-dashboard-stalls",
    onRefresh: loadDashboard,
    table: "stalls",
  });

  useRealtimeRefresh({
    channelName: "admin-dashboard-profiles",
    onRefresh: loadDashboard,
    table: "profiles",
  });

  const statCards = [
    {
      color: "text-primary",
      icon: Store,
      label: "Total Stalls",
      value: state.overview.totalStalls,
    },
    {
      color: "text-secondary",
      icon: TrendingUp,
      label: "Occupied",
      value: state.overview.occupiedStalls,
    },
    {
      color: "text-primary",
      icon: Store,
      label: "Available",
      value: state.overview.availableStalls,
    },
    {
      color: "text-destructive",
      icon: AlertTriangle,
      label: "Maintenance",
      value: state.overview.maintenanceStalls,
    },
    {
      color: "text-primary",
      icon: Users,
      label: "Active Vendors",
      value: state.overview.activeVendors,
    },
    {
      color: "text-secondary",
      icon: CreditCard,
      label: "Recent Payments",
      value: state.recentPayments.length,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage marketplace activity, vendor communications, and
              collections.
            </p>
          </div>
          <EmailNotificationPanel />
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <Card key={card.label} className="p-4 shadow-card">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <card.icon className={`mb-2 h-5 w-5 ${card.color}`} />
                  <p className="font-display text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </>
              )}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Recent Announcements
            </h2>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : state.announcements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
                No announcements available.
              </div>
            ) : (
              <div className="space-y-3">
                {state.announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-xl border border-border bg-muted/40 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {announcement.title}
                      </p>
                      <AnnouncementStatusBadge
                        status={announcement.status}
                        type={announcement.type}
                      />
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <RecentPaymentsList
            title="Recent Payments"
            items={state.recentPayments}
            loading={loading}
            emptyCopy="No payments recorded yet."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
