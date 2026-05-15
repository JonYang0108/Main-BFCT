import { useCallback, useEffect, useState } from "react";
import { Bell, Store, TrendingUp, Users } from "lucide-react";

import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import DashboardLayout from "@/components/DashboardLayout";
import RecentPaymentsList from "@/components/payments/RecentPaymentsList";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { announcementService } from "@/services/announcementService";
import { paymentService } from "@/services/paymentService";
import { stallService } from "@/services/stallService";
import { vendorService } from "@/services/vendorService";
import type {
  AnnouncementRow,
  DashboardRecentPayment,
  StallsListViewRow,
} from "@/types/domain";

interface StaffDashboardState {
  announcements: AnnouncementRow[];
  available: number;
  occupied: number;
  recentPayments: DashboardRecentPayment[];
  totalStalls: number;
  totalVendors: number;
}

const initialState: StaffDashboardState = {
  announcements: [],
  available: 0,
  occupied: 0,
  recentPayments: [],
  totalStalls: 0,
  totalVendors: 0,
};

function countByStatus(
  stalls: StallsListViewRow[],
  status: "available" | "occupied",
): number {
  return stalls.filter((stall) => stall.status === status).length;
}

export default function StaffDashboard() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<StaffDashboardState>(initialState);

  const loadDashboard = useCallback(async () => {
    try {
      setErrorMessage(null);

      const [stalls, vendors, announcements, recentPayments] =
        await Promise.all([
          stallService.listStaffStalls(),
          vendorService.listActiveVendors(),
          announcementService.listAnnouncements(4),
          paymentService.listRecentPayments(8),
        ]);

      setState({
        announcements,
        available: countByStatus(stalls, "available"),
        occupied: countByStatus(stalls, "occupied"),
        recentPayments,
        totalStalls: stalls.length,
        totalVendors: vendors.length,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useRealtimeRefresh({
    channelName: "staff-dashboard-payments",
    onRefresh: loadDashboard,
    table: "payments",
  });

  useRealtimeRefresh({
    channelName: "staff-dashboard-announcements",
    onRefresh: loadDashboard,
    table: "announcements",
  });

  useRealtimeRefresh({
    channelName: "staff-dashboard-stalls",
    onRefresh: loadDashboard,
    table: "stalls",
  });

  const statCards = [
    { icon: Store, label: "Total Stalls", value: state.totalStalls },
    { icon: TrendingUp, label: "Occupied", value: state.occupied },
    { icon: Store, label: "Available", value: state.available },
    { icon: Users, label: "Vendors", value: state.totalVendors },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Staff Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor stalls, approved vendors, and recent collections.
          </p>
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.label} className="p-4 shadow-card">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <card.icon className="mb-2 h-5 w-5 text-primary" />
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
          <RecentPaymentsList
            title="Recent Payments"
            items={state.recentPayments}
            loading={loading}
            emptyCopy="No recent payments have been recorded."
          />

          <Card className="p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Latest Announcements
            </h2>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
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
        </div>
      </div>
    </DashboardLayout>
  );
}
