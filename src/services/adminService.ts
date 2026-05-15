import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";

import { paymentService } from "@/services/paymentService";

import type {
  AdminOverviewStats,
  CreateVendorInput,
  PaymentRecord,
} from "@/types/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractFunctionErrorMessage(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  return typeof result.error === "string" ? result.error : null;
}

export const adminService = {
  async approvePayment(
    paymentId: string,
    approvedBy: string,
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("approve_payment", {
      _approved_by: approvedBy,
      _payment_id: paymentId,
    });

    if (error) {
      throw toAppError(error, "Unable to approve the payment.");
    }

    return data ?? false;
  },

  async createVendor(input: CreateVendorInput): Promise<void> {
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      {
        body: {
          action: "create-vendor",

          address: input.address ?? null,

          businessName: input.businessName ?? null,

          email: input.email.trim(),

          fullName: input.fullName.trim(),

          password: input.password,

          phone: input.phone ?? null,
        },
      },
    );

    if (error) {
      throw toAppError(error, "Unable to create the vendor account.");
    }

    const edgeErrorMessage = extractFunctionErrorMessage(data);

    if (edgeErrorMessage) {
      throw new Error(edgeErrorMessage);
    }
  },

  async deleteVendor(userId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      {
        body: {
          action: "delete-user",
          userId,
        },
      },
    );

    if (error) {
      throw toAppError(error, "Unable to delete the vendor account.");
    }

    const edgeErrorMessage = extractFunctionErrorMessage(data);

    if (edgeErrorMessage) {
      throw new Error(edgeErrorMessage);
    }
  },

  async getOverview(): Promise<AdminOverviewStats> {
    const { data, error } = await supabase.rpc("fn_admin_overview");

    if (error) {
      throw toAppError(error, "Unable to load the admin overview.");
    }

    const row = data?.[0];

    return {
      activeVendors: row?.active_vendors ?? 0,

      availableStalls: row?.available_stalls ?? 0,

      maintenanceStalls: row?.maintenance_stalls ?? 0,

      occupancyPct: row?.occupancy_pct ?? 0,

      occupiedStalls: row?.occupied_stalls ?? 0,

      totalCollected: row?.total_collected ?? 0,

      totalOverdue: row?.total_overdue ?? 0,

      totalPayments: row?.total_payments ?? 0,

      totalPending: row?.total_pending ?? 0,

      totalStalls: row?.total_stalls ?? 0,
    };
  },

  async getPendingPayments(): Promise<PaymentRecord[]> {
    return paymentService.listAdminPayments({
      status: "pending",
    });
  },
};
