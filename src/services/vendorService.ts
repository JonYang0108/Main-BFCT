import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type {
  AccountStatus,
  ActiveVendorViewRow,
  VendorOption,
  VendorOverviewStats,
} from "@/types/domain";

function normalizeAccountStatus(status: string | null): AccountStatus {
  if (
    status === "active" ||
    status === "declined" ||
    status === "pending" ||
    status === "suspended"
  ) {
    return status;
  }

  return "pending";
}

function mapActiveVendor(row: ActiveVendorViewRow): VendorOption {
  return {
    accountStatus: normalizeAccountStatus(row.account_status),
    address: row.address,
    businessName: row.business_name,
    createdAt: row.created_at,
    email: row.email ?? "",
    fullName: row.full_name ?? "Unknown Vendor",
    phone: row.phone ?? row.contact_number,
    role:
      row.role === "admin" || row.role === "staff" || row.role === "vendor"
        ? row.role
        : null,
    stallId: row.stall_id,
    stallNumber: row.stall_number,
    userId: row.user_id ?? "",
  };
}

export const vendorService = {
  async getAllVendorProfiles(): Promise<VendorOption[]> {
    return this.listAdminVendors();
  },

  async getValidVendors(): Promise<VendorOption[]> {
    return this.listActiveVendors();
  },

  async getVendorOverview(vendorId: string): Promise<VendorOverviewStats | null> {
    const { data, error } = await supabase.rpc("fn_vendor_overview", {
      _vendor_id: vendorId,
    });

    if (error) {
      throw toAppError(error, "Unable to load the vendor overview.");
    }

    const row = data?.[0];

    if (!row) {
      return null;
    }

    return {
      businessName: row.business_name,
      email: row.email,
      fullName: row.full_name,
      location: row.location,
      monthlyRent: row.monthly_rent,
      nextDueDate: row.next_due_date,
      size: row.size,
      stallId: row.stall_id,
      stallNumber: row.stall_number,
      stallStatus: row.stall_status,
      totalOverdue: row.total_overdue,
      totalPaid: row.total_paid,
      totalPending: row.total_pending,
      userId: row.user_id,
    };
  },

  async listActiveVendors(): Promise<VendorOption[]> {
    const { data, error } = await supabase
      .from("v_active_vendors")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      throw toAppError(error, "Unable to load active vendors.");
    }

    return (data ?? []).map(mapActiveVendor);
  },

  async listAdminVendors(search?: string): Promise<VendorOption[]> {
    const { data, error } = await supabase.rpc("fn_admin_vendors_list", {
      _search: search?.trim() || null,
    });

    if (error) {
      throw toAppError(error, "Unable to load vendor records.");
    }

    return (data ?? []).map(mapActiveVendor);
  },

  async listVendorProfiles(statuses?: string[]): Promise<VendorOption[]> {
    const vendors = await this.listAdminVendors();

    if (!statuses || statuses.length === 0) {
      return vendors;
    }

    return vendors.filter((vendor) => statuses.includes(vendor.accountStatus));
  },
};
