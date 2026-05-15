import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type {
  AccountRequestRecord,
  AccountStatus,
  ProfileRow,
  UserValidIdRow,
  VendorRequestStatus,
} from "@/types/domain";

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

function isRpcNotFoundError(error: unknown): boolean {
  // Supabase REST returns 404 when the RPC is missing from the DB.
  // Depending on supabase-js version, this may surface as a specific error
  // type/message.
  if (error && typeof error === "object") {
    const anyErr = error as Record<string, unknown>;
    const message = typeof anyErr.message === "string"
      ? anyErr.message
      : String(anyErr.message ?? "");
    const details = typeof anyErr.details === "string" ? anyErr.details : "";
    const status = anyErr.status;
    const code = typeof anyErr.code === "string"
      ? anyErr.code
      : String(anyErr.code ?? "");

    const msg = `${message} ${details} ${code}`.toLowerCase();

    return (
      msg.includes("not found") ||
      msg.includes("rpc") ||
      msg.includes("404") ||
      status === 404
    );
  }

  if (typeof error === "string") {
    return error.toLowerCase().includes("not found");
  }

  return false;
}

export const accountRequestService = {
  async approveAccountRequest(requestId: string): Promise<void> {
    const { data, error } = await supabase.rpc("approve_account_request", {
      _request_id: requestId,
    });

    if (error) {
      // Fallback for environments where approve_account_request is not present
      // but approve_vendor_request exists.
      if (isRpcNotFoundError(error)) {
        const { error: fallbackError } = await supabase.rpc(
          "approve_vendor_request",
          { _request_id: requestId },
        );

        if (fallbackError) {
          throw toAppError(
            fallbackError,
            "Unable to approve the account request (fallback failed).",
          );
        }
        return;
      }

      throw toAppError(error, "Unable to approve the account request.");
    }

    // avoid unused var lint
    void data;
  },

  async declineAccountRequest(
    requestId: string,
    declineReason: string,
  ): Promise<void> {
    const { data, error } = await supabase.rpc("decline_account_request", {
      _reason: declineReason,
      _request_id: requestId,
    });

    if (error) {
      // Fallback for environments where decline_account_request is not present
      // but decline_vendor_request exists.
      if (isRpcNotFoundError(error)) {
        const { error: fallbackError } = await supabase.rpc(
          "decline_vendor_request",
          { _decline_reason: declineReason, _request_id: requestId },
        );

        if (fallbackError) {
          throw toAppError(
            fallbackError,
            "Unable to decline the account request (fallback failed).",
          );
        }
        return;
      }

      throw toAppError(error, "Unable to decline the account request.");
    }

    // avoid unused var lint
    void data;
  },

  async listAccountRequests(): Promise<AccountRequestRecord[]> {
    const [
      { data: requests, error: requestsError },
      { data: profiles, error: profilesError },
      { data: validIds, error: validIdsError },
    ] = await Promise.all([
      supabase
        .from("v_account_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_valid_ids").select("*"),
    ]);

    if (requestsError) {
      throw toAppError(requestsError, "Unable to load account requests.");
    }

    if (profilesError) {
      throw toAppError(profilesError, "Unable to load applicant profiles.");
    }

    if (validIdsError) {
      throw toAppError(validIdsError, "Unable to load applicant files.");
    }

    const profileMap = new Map<string, ProfileRow>();
    for (const profile of profiles ?? []) {
      profileMap.set(profile.user_id, profile);
    }

    const validIdsMap = new Map<string, UserValidIdRow[]>();
    for (const validId of validIds ?? []) {
      const current = validIdsMap.get(validId.user_id) ?? [];
      current.push(validId);
      validIdsMap.set(validId.user_id, current);
    }

    return (requests ?? []).map((request) => ({
      account_status: normalizeAccountStatus(request.account_status),
      address: request.address ?? request.profile_address ?? "",
      birthdate: request.birthdate,
      business_name: request.business_name,
      contact_number: request.contact_number,
      created_at: request.created_at ?? new Date(0).toISOString(),
      decline_reason: request.decline_reason,
      email: request.email ?? "",
      full_name: request.full_name ?? "",
      id: request.id ?? "",
      phone: request.phone ?? request.profile_phone ?? "",
      profile: request.user_id ? profileMap.get(request.user_id) ?? null : null,
      status: normalizeRequestStatus(request.status),
      updated_at: request.updated_at ?? request.created_at ??
        new Date(0).toISOString(),
      user_id: request.user_id ?? "",
      validIds: request.user_id ? validIdsMap.get(request.user_id) ?? [] : [],
    }));
  },
};
