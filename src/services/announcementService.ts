import { supabase } from "@/integrations/supabase/client";
import {
  getAnnouncementLegacyType,
  sortAnnouncementsByPriority,
} from "@/lib/announcement-utils";
import { toAppError } from "@/lib/supabaseError";
import type { AnnouncementFormValues, AnnouncementRow } from "@/types/domain";

// Announcement Services using ONLY Supabase
export const announcementService = {
  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      throw toAppError(error, "Failed to delete the announcement.");
    }
  },

  async listAnnouncements(limit?: number): Promise<AnnouncementRow[]> {
    if (typeof limit === "number") {
      const { data, error } = await supabase.rpc("fn_recent_announcements", {
        _limit: limit,
      });

      if (error) {
        throw toAppError(error, "Failed to load announcements.");
      }

      return sortAnnouncementsByPriority(data ?? []);
    }

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw toAppError(error, "Failed to load announcements.");
    }

    return sortAnnouncementsByPriority(data ?? []);
  },

  async saveAnnouncement(
    values: AnnouncementFormValues,
    createdBy: string | null,
    id?: string,
  ): Promise<AnnouncementRow> {
    const payload = {
      title: values.title.trim(),
      content: values.content.trim(),
      status: values.status,
      type: getAnnouncementLegacyType(values.status),
      created_by: createdBy,
    };

    if (id) {
      const { data, error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw toAppError(error, "Failed to update the announcement.");
      }

      return data;
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw toAppError(error, "Failed to create the announcement.");
    }

    return data;
  },
};
