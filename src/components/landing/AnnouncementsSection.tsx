import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { announcementService } from "@/services/announcementService";
import type { AnnouncementRow } from "@/types/domain";

import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const data = await announcementService.listAnnouncements(4);
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

  useRealtimeRefresh({
    enabled: true,
    channelName: "landing-announcements",
    table: "announcements",
    onRefresh: () => {
      void loadAnnouncements();
    },
  });


  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <section id="announcements" className="bg-muted/50 py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Bell className="h-4 w-4" />
            Latest Updates
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Announcements
          </h2>
        </motion.div>

        {loading ? (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <Skeleton className="mb-4 h-5 w-28" />
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive">
            {errorMessage}
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">
              No Announcements Available
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {announcements.map((announcement, index) => (
              <motion.article
                key={announcement.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <AnnouncementStatusBadge
                    status={announcement.status}
                    type={announcement.type}
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {announcement.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {announcement.content}
                </p>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
