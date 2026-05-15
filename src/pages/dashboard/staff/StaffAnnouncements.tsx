import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, Info } from "lucide-react";

import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeAnnouncementStatus } from "@/lib/announcement-utils";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { announcementService } from "@/services/announcementService";
import type { AnnouncementRow } from "@/types/domain";

const summaryIcons = {
  normal: Info,
  urgent: AlertCircle,
  warning: AlertTriangle,
} as const;

export default function StaffAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await announcementService.listAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load announcements.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useRealtimeRefresh({
    channelName: "staff-announcements",
    onRefresh: loadAnnouncements,
    table: "announcements",
  });

  const counts = useMemo(() => {
    return announcements.reduce(
      (accumulator, announcement) => {
        const status = normalizeAnnouncementStatus(announcement);
        accumulator[status] += 1;
        return accumulator;
      },
      {
        normal: 0,
        urgent: 0,
        warning: 0,
      },
    );
  }, [announcements]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            View recent notices sorted by urgency.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(["urgent", "warning", "normal"] as const).map((status) => {
            const Icon = summaryIcons[status];

            return (
              <Card key={status} className="p-4 shadow-card">
                <Icon className="mb-2 h-5 w-5 text-primary" />
                <p className="font-display text-2xl font-bold text-foreground">
                  {counts[status]}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {status}
                </p>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" />
            All Announcements
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-3 h-10 w-10 opacity-40" />
              No announcements yet.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-xl border border-border bg-muted/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {announcement.title}
                        </p>
                        <AnnouncementStatusBadge
                          status={announcement.status}
                          type={announcement.type}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
