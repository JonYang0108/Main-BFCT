import { getCurrentUser, supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type { NotificationRow } from "@/types/domain";

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be signed in to load notifications.");
  }

  return user.id;
}

export const notificationService = {
  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
      throw toAppError(error, "Unable to delete the notification.");
    }
  },

  async getNotifications(): Promise<NotificationRow[]> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw toAppError(error, "Unable to load notifications.");
    }

    return data ?? [];
  },

  async markAllAsRead(): Promise<number> {
    const userId = await requireUserId();
    const { data, error } = await supabase.rpc("fn_mark_all_notifications_read", {
      _user_id: userId,
    });

    if (error) {
      throw toAppError(error, "Unable to mark notifications as read.");
    }

    return data ?? 0;
  },

  async markAsRead(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("fn_mark_notification_read", {
      _notification_id: id,
    });

    if (error) {
      throw toAppError(error, "Unable to update the notification.");
    }

    return data ?? false;
  },
};
