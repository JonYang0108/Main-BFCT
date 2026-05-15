import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { announcementService } from "@/services/announcementService";
import type { AnnouncementRow } from "@/types/domain";

export default function VendorAnnouncements() {
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
    channelName: "vendor-announcements",
    onRefresh: loadAnnouncements,
    table: "announcements",
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Stay updated with the latest marketplace notices.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-6">
                <Skeleton className="mb-3 h-5 w-32" />
                <Skeleton className="mb-2 h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))}
          </div>
        ) : errorMessage ? (
          <Card className="p-8 text-center text-sm text-destructive">
            {errorMessage}
          </Card>
        ) : announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-1 font-semibold text-foreground">
              No Announcements
            </h3>
            <p className="text-sm text-muted-foreground">
              There are no announcements at this time.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="overflow-hidden">
                <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-base">
                      {announcement.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>

                  <AnnouncementStatusBadge
                    className="w-fit"
                    status={announcement.status}
                    type={announcement.type}
                  />
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
