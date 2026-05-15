import type { AnnouncementStatus } from "@/types/domain";

export const announcementPriority: Record<AnnouncementStatus, number> = {
  urgent: 0,
  warning: 1,
  normal: 2,
};

export function normalizeAnnouncementStatus(input: {
  status?: string | null;
  type?: string | null;
}): AnnouncementStatus {
  if (input.status === "urgent" || input.type === "urgent") {
    return "urgent";
  }

  if (input.status === "warning" || input.type === "warning") {
    return "warning";
  }

  return "normal"; // covers "normal", "system", or anything else
}

export function getAnnouncementLegacyType(status: AnnouncementStatus): string {
  // Backwards-compatible mapping to the DB enum.
  // announcement_status is separate from notification_type.
  // We store announcements as notification_type values in `announcements.type`.

  return "status";
}

export function sortAnnouncementsByPriority<
  T extends {
    created_at: string;
    status?: string | null;
    type?: string | null;
  },
>(announcements: T[]): T[] {
  return [...announcements].sort((left, right) => {
    const leftPriority =
      announcementPriority[normalizeAnnouncementStatus(left)];
    const rightPriority =
      announcementPriority[normalizeAnnouncementStatus(right)];

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return (
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });
}
