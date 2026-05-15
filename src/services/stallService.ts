import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type {
  StallInsert,
  StallRow,
  StallStatus,
  StallUpdate,
  StallsListViewRow,
} from "@/types/domain";

export const stallService = {
  async createStall(input: StallInsert): Promise<StallRow> {
    const { data, error } = await supabase
      .from("stalls")
      .insert(input)
      .select("*")
      .single();

    if (error) {
      throw toAppError(error, "Unable to create the stall.");
    }

    return data;
  },

  async deleteStall(id: string): Promise<void> {
    const { error } = await supabase.from("stalls").delete().eq("id", id);

    if (error) {
      throw toAppError(error, "Unable to delete the stall.");
    }
  },

  async getVendorStall(vendorId: string): Promise<StallsListViewRow | null> {
    const { data, error } = await supabase.rpc("fn_vendor_stall", {
      _vendor_id: vendorId,
    });

    if (error) {
      throw toAppError(error, "Unable to load the assigned stall.");
    }

    return data?.[0] ?? null;
  },

  async listAdminStalls(search?: string, status?: string): Promise<StallsListViewRow[]> {
    const { data, error } = await supabase.rpc("fn_admin_stalls_list", {
      _search: search?.trim() || null,
      _status: status?.trim() || null,
    });

    if (error) {
      throw toAppError(error, "Unable to load stall records.");
    }

    return data ?? [];
  },

  async listRawStalls(status?: StallStatus): Promise<StallRow[]> {
    let query = supabase.from("stalls").select("*").order("stall_number");

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw toAppError(error, "Unable to load stalls.");
    }

    return data ?? [];
  },

  async listStaffStalls(search?: string): Promise<StallsListViewRow[]> {
    const { data, error } = await supabase.rpc("fn_staff_stalls_list", {
      _search: search?.trim() || null,
    });

    if (error) {
      throw toAppError(error, "Unable to load staff stall records.");
    }

    return data ?? [];
  },

  async listVendorRawStalls(vendorId: string): Promise<StallRow[]> {
    const { data, error } = await supabase
      .from("stalls")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("stall_number");

    if (error) {
      throw toAppError(error, "Unable to load the vendor stalls.");
    }

    return data ?? [];
  },

  async updateStall(id: string, updates: StallUpdate): Promise<StallRow> {
    const { data, error } = await supabase
      .from("stalls")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw toAppError(error, "Unable to update the stall.");
    }

    return data;
  },
};
