import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type {
  StallInsert,
  StallRow,
  StallsListViewRow,
  StallStatus,
  StallUpdate,
} from "@/types/domain";

export const stallService = {
  async createStall(input: StallInsert): Promise<StallRow> {
    // `fn_create_stall` RPC is not present in the generated Supabase types.
    // Record directly via table insert, then fetch the created row.
    const { data, error } = await supabase
      .from("stalls")
      .insert({
        stall_number: input.stall_number,
        monthly_rent: input.monthly_rent,
        status: input.status ?? "available",
        location: input.location ?? null,
        size: input.size ?? null,
        vendor_id: input.vendor_id ?? null,
        notes: input.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw toAppError(error, "Unable to create the stall.");

    const createdId = data?.id;
    if (!createdId) {
      throw new Error("Unable to determine created stall id.");
    }

    const { data: row, error: fetchError } = await supabase
      .from("stalls")
      .select("*")
      .eq("id", createdId)
      .single();

    if (fetchError) {
      throw toAppError(fetchError, "Stall created but failed to load details.");
    }

    return row;
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

  async listAdminStalls(
    search?: string,
    status?: string,
  ): Promise<StallsListViewRow[]> {
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
    // Try privileged RPC first (admin/staff), fall back to direct query (vendor)
    const { data, error } = await supabase
      .from("stalls")
      .select("*")
      .order("stall_number");

    if (error) {
      // 403 means RLS blocked it — user is likely a vendor, filter to their stalls
      if (
        error.code === "42501" || error.message.includes("row-level security")
      ) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw toAppError(error, "Unable to load stalls.");

        return this.listVendorRawStalls(user.id);
      }
      throw toAppError(error, "Unable to load stalls.");
    }

    const rows = data ?? [];
    return status ? rows.filter((s) => s.status === status) : rows;
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
