import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";

import type {
  AccountRequestRecord,
  AccountStatus,
  ProfileRow,
  UserValidIdRow,
  VendorRequestStatus,
} from "@/types/domain";

type VAccountRequestsWithValidIdsRow = {
  id?: string | null;
  request_id?: string | null;
  user_id?: string | null;
  account_status?: string | null;
  address?: string | null;
  profile_address?: string | null;
  birthdate?: string | null;
  business_name?: string | null;
  contact_number?: string | null;
  created_at?: string | null;
  decline_reason?: string | null;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  profile_phone?: string | null;
  status?: string | null;
  updated_at?: string | null;

  valid_id_row_id?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_url?: string | null;
  storage_path?: string | null;
  valid_id_created_at?: string | null;
  valid_id_updated_at?: string | null;
};

function normalizeAccountStatus(status: string | null): AccountStatus | null {
  if (
    status === "active" ||
    status === "declined" ||
    status === "pending" ||
    status === "suspended"
  ) {
    return status;
  }

  return null;
}

function normalizeRequestStatus(
  status: string | null | undefined,
): VendorRequestStatus {
  if (status === "approved" || status === "declined" || status === "pending") {
    return status;
  }

  return "pending";
}

/**
 * Input payload for creating/updating a vendor request from the website.
 * Adjust keys if your UI uses different names.
 */
export type CreateAccountRequestInput = {
  email: string;
  full_name: string;
  business_name?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  address?: string | null;
  birthdate?: string | null;
};

export const accountRequestService = {
  async approveAccountRequest(requestId: string): Promise<void> {
    const { data: requestRow, error: requestErr } = await supabase
      .from("vendor_requests")
      .select("id,user_id")
      .eq("id", requestId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (requestErr) {
      throw toAppError(requestErr, "Unable to approve the account request.");
    }

    const userId = requestRow?.user_id;

    if (!userId) {
      throw new Error("Missing request user ID.");
    }

    // Activate profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        account_status: "active",
        role: "vendor",
      })
      .eq("user_id", userId);

    if (profileErr) {
      throw toAppError(profileErr, "Unable to activate vendor profile.");
    }

    // Create vendor role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "vendor",
        },
        {
          onConflict: "user_id",
        },
      );

    if (roleErr) {
      throw toAppError(roleErr, "Unable to provision vendor role.");
    }

    // Update request
    const { error: requestUpdateErr } = await supabase
      .from("vendor_requests")
      .update({
        status: "approved",
      })
      .eq("id", requestId);

    if (requestUpdateErr) {
      throw toAppError(requestUpdateErr, "Unable to update request status.");
    }
  },

  async declineAccountRequest(
    requestId: string,
    declineReason: string,
  ): Promise<void> {
    const { data: requestRow, error: requestErr } = await supabase
      .from("vendor_requests")
      .select("id,user_id")
      .eq("id", requestId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (requestErr) {
      throw toAppError(requestErr, "Unable to decline request.");
    }

    const userId = requestRow?.user_id;

    if (!userId) {
      throw new Error("Missing request user ID.");
    }

    // Update profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        account_status: "declined",
      })
      .eq("user_id", userId);

    if (profileErr) {
      throw toAppError(profileErr, "Unable to decline vendor profile.");
    }

    // Update request
    const { error: requestUpdateErr } = await supabase
      .from("vendor_requests")
      .update({
        status: "declined",
        decline_reason: declineReason,
      })
      .eq("id", requestId);

    if (requestUpdateErr) {
      throw toAppError(requestUpdateErr, "Unable to update request.");
    }
  },

  /**
   * ✅ Create/Update (upsert) the user's vendor request.
   * Fixes:
   * - 409 conflict (because vendor_requests.user_id is UNIQUE)
   * - NOT NULL user_id being inserted as null (we always set user_id = auth.uid())
   */
  async createAccountRequest(
    payload: CreateAccountRequestInput,
  ): Promise<void> {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) throw toAppError(userErr, "Unable to read user session.");
    if (!user) throw new Error("Not authenticated.");

    const userId = user.id;

    // 1) Ensure FK target row exists (likely public.profiles)
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          email: payload.email,
          full_name: payload.full_name,
          account_status: "pending",
          role: null,
        },
        { onConflict: "user_id" },
      );

    if (profileErr) {
      throw toAppError(
        profileErr,
        "Unable to create/ensure vendor profile.",
      );
    }

    // 2) Upsert vendor request
    const { error: requestErr } = await supabase
      .from("vendor_requests")
      .upsert(
        {
          user_id: userId,
          email: payload.email,
          full_name: payload.full_name,
          business_name: payload.business_name ?? null,
          phone: payload.phone ?? null,
          contact_number: payload.contact_number ?? null,
          address: payload.address ?? "",
          birthdate: payload.birthdate ?? null,
          status: "pending",
          decline_reason: null,
        },
        { onConflict: "user_id" },
      );

    if (requestErr) {
      throw toAppError(requestErr, "Unable to submit account request.");
    }
  },

  async listAccountRequests(): Promise<AccountRequestRecord[]> {
    // NOTE: This function constructs AccountRequestRecord objects from a joined/denormalized
    // Supabase query. To avoid brittle inference (which can lead to `never`-typed properties),
    // we build using explicit casting via a helper.

    type AccountRequestLoose =
      & Omit<
        AccountRequestRecord,
        "validIds"
      >
      & { validIds: UserValidIdRow[] };

    const makeAccountRequest = (
      row: VAccountRequestsWithValidIdsRow,
      userId: string,
    ): AccountRequestLoose => ({
      id: row.id ?? row.request_id ?? "",
      user_id: userId,

      full_name: row.full_name ?? "",
      email: row.email ?? "",

      business_name: row.business_name ?? null,
      phone: row.phone ?? row.profile_phone ?? "",

      contact_number: row.contact_number ?? null,

      address: row.address ?? row.profile_address ?? "",

      birthdate: row.birthdate ?? null,

      status: normalizeRequestStatus(row.status),

      account_status: normalizeAccountStatus(row.account_status),

      decline_reason: row.decline_reason ?? null,

      created_at: row.created_at ?? new Date().toISOString(),

      updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),

      profile: userId ? profileMap.get(userId) ?? null : null,

      validIds: [],
    });
    // Note: supabase's typed client isn't aligned with this joined/extended row shape.
    const { data: joinedRowsRaw, error: joinedError } = await supabase
      .from("vendor_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (joinedError) {
      throw toAppError(joinedError, "Unable to load account requests.");
    }

    const joinedRows =
      (joinedRowsRaw ?? []) as unknown as VAccountRequestsWithValidIdsRow[];

    const userIds: string[] = Array.from(
      new Set(
        (joinedRows ?? [])
          .map((r) => (typeof r.user_id === "string" ? r.user_id : null))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      throw toAppError(profilesError, "Unable to load profiles.");
    }

    const profileMap = new Map<string, ProfileRow>();

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.user_id, profile);
    }

    const grouped = new Map<string, AccountRequestRecord>();

    for (const row of joinedRows ?? []) {
      const requestId = row.id ?? row.request_id ?? "";
      if (!requestId) continue;

      const userId = row.user_id ?? "";

      if (!grouped.has(requestId)) {
        const newRecord: AccountRequestRecord = {
          id: requestId,
          user_id: userId,

          full_name: row.full_name ?? "",
          email: row.email ?? "",

          business_name: row.business_name ?? null,
          phone: row.phone ?? row.profile_phone ?? "",

          contact_number: row.contact_number ?? null,

          address: row.address ?? row.profile_address ?? "",

          birthdate: row.birthdate ?? null,

          status: normalizeRequestStatus(row.status),

          account_status: normalizeAccountStatus(row.account_status),

          decline_reason: row.decline_reason ?? null,

          created_at: row.created_at ?? new Date().toISOString(),

          updated_at: row.updated_at ?? row.created_at ??
            new Date().toISOString(),

          profile: userId ? profileMap.get(userId) ?? null : null,

          // Explicit typing prevents `never[]` inference
          validIds: [] as UserValidIdRow[],
        };

        grouped.set(requestId, newRecord);
      }

      if (row.valid_id_row_id) {
        const existing = grouped.get(requestId);
        if (!existing) continue;

        (existing.validIds as UserValidIdRow[]).push({
          id: row.valid_id_row_id,
          user_id: userId,

          file_name: row.file_name ?? "",
          file_type: row.file_type ?? "",
          file_url: row.file_url ?? null,
          storage_path: row.storage_path ?? "",

          created_at: row.valid_id_created_at ?? new Date().toISOString(),
          updated_at: row.valid_id_updated_at ??
            row.valid_id_created_at ??
            new Date().toISOString(),
        } as unknown as UserValidIdRow);
      }
    }

    return Array.from(grouped.values());
  },
};

export default accountRequestService;
