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
    if (
        status === "approved" || status === "declined" || status === "pending"
    ) {
        return status;
    }

    return "pending";
}

export const accountRequestServiceV2 = {
    async approveAccountRequest(requestId: string): Promise<void> {
        const { error } = await supabase.rpc("approve_account_request", {
            _request_id: requestId,
        });

        if (!error) {
            return;
        }

        // Fallback only if RPC missing / not present in this environment.
        // Otherwise surface the real error to the UI.
        const fallback = await supabase.rpc("approve_vendor_request", {
            _request_id: requestId,
        });

        if (fallback.error) {
            throw toAppError(
                error,
                "Unable to approve the account request.",
            );
        }
    },

    async declineAccountRequest(
        requestId: string,
        declineReason: string,
    ): Promise<void> {
        const { data, error } = await supabase.rpc("decline_account_request", {
            _reason: declineReason,
            _request_id: requestId,
        });

        if (!error) {
            void data;
            return;
        }

        // Fallback only if RPC missing / not present in this environment.
        const fallback = await supabase.rpc("decline_vendor_request", {
            _decline_reason: declineReason,
            _request_id: requestId,
        });

        if (fallback.error) {
            throw toAppError(error, "Unable to decline the account request.");
        }

        void data;
    },

    async listAccountRequests(): Promise<AccountRequestRecord[]> {
        // Pull the joined rows (request + valid id rows). We then group them in JS.
        // supabase-js types currently don't include this view in the generated union types.
        // We cast to `any` to avoid TS overload errors.
        const { data: joinedRows, error: joinedError } =
            await (supabase as unknown as {
                from: (view: string) => {
                    select: (cols: string) => {
                        order: (
                            col: string,
                            opts: { ascending: boolean },
                        ) => Promise<
                            {
                                data: Array<Record<string, unknown>> | null;
                                error: unknown;
                            }
                        >;
                    };
                };
            }).from("v_account_requests_with_valid_ids")
                .select("*")
                .order("created_at", { ascending: false });

        if (joinedError) {
            throw toAppError(joinedError, "Unable to load account requests.");
        }

        // Profiles are still fetched separately for additional fields.
        const userIds = Array.from(
            new Set(
                ((joinedRows ?? []) as Array<{ user_id?: unknown }>).map(
                    (r) => (typeof r.user_id === "string" ? r.user_id : ""),
                ).filter(Boolean),
            ),
        ) as string[];

        const { data: profiles, error: profilesError } = userIds.length
            ? await supabase.from("profiles").select("*").in("user_id", userIds)
            : { data: [], error: null };

        if (profilesError) {
            throw toAppError(
                profilesError,
                "Unable to load applicant profiles.",
            );
        }

        const profileMap = new Map<string, ProfileRow>();
        for (const profile of profiles ?? []) {
            profileMap.set(profile.user_id, profile);
        }

        const byRequestId = new Map<string, AccountRequestRecord>();

        for (
            const row of (joinedRows ?? []) as Array<Record<string, unknown>>
        ) {
            const requestIdRaw = typeof row.id === "string"
                ? row.id
                : (typeof row.request_id === "string" ? row.request_id : null);

            const requestId = (requestIdRaw ?? "").toString();
            if (!requestId) {
                // Joined view row is missing/invalid UUID. Skip to avoid RPC "invalid input syntax for type uuid: \"\"".
                continue;
            }

            const userId = typeof row.user_id === "string" ? row.user_id : "";

            if (!byRequestId.has(requestId)) {
                byRequestId.set(requestId, {
                    account_status: normalizeAccountStatus(
                        typeof row.account_status === "string"
                            ? row.account_status
                            : null,
                    ),
                    address: (typeof row.address === "string"
                        ? row.address
                        : null) ??
                        (typeof row.profile_address === "string"
                            ? row.profile_address
                            : null) ??
                        "",
                    birthdate: typeof row.birthdate === "string"
                        ? row.birthdate
                        : null,
                    business_name: typeof row.business_name === "string"
                        ? row.business_name
                        : null,
                    contact_number: typeof row.contact_number === "string"
                        ? row.contact_number
                        : null,
                    created_at: typeof row.created_at === "string"
                        ? row.created_at
                        : new Date(0).toISOString(),
                    decline_reason: typeof row.decline_reason === "string"
                        ? row.decline_reason
                        : null,
                    email: typeof row.email === "string" ? row.email : "",
                    full_name: typeof row.full_name === "string"
                        ? row.full_name
                        : "",
                    id: requestId,
                    phone: (typeof row.phone === "string" ? row.phone : null) ??
                        (typeof row.profile_phone === "string"
                            ? row.profile_phone
                            : null) ??
                        "",
                    profile: userId ? profileMap.get(userId) ?? null : null,
                    status: normalizeRequestStatus(
                        typeof row.status === "string" ? row.status : null,
                    ),
                    updated_at: typeof row.updated_at === "string"
                        ? row.updated_at
                        : typeof row.created_at === "string"
                        ? row.created_at
                        : new Date(0).toISOString(),
                    user_id: userId,
                    validIds: [],
                });
            }

            // Append valid id if present
            if (
                typeof row.valid_id_row_id === "string" && row.valid_id_row_id
            ) {
                const existing = byRequestId.get(requestId);
                if (existing) {
                    (existing.validIds as UserValidIdRow[]).push({
                        id: row.valid_id_row_id,
                        user_id: userId,
                        file_name: typeof row.file_name === "string"
                            ? row.file_name
                            : "",
                        file_type: typeof row.file_type === "string"
                            ? row.file_type
                            : "",
                        file_url: typeof row.file_url === "string"
                            ? row.file_url
                            : null,
                        storage_path: typeof row.storage_path === "string"
                            ? row.storage_path
                            : "",
                        created_at: typeof row.valid_id_created_at === "string"
                            ? row.valid_id_created_at
                            : new Date(0).toISOString(),
                        updated_at: typeof row.valid_id_updated_at === "string"
                            ? row.valid_id_updated_at
                            : typeof row.valid_id_created_at === "string"
                            ? row.valid_id_created_at
                            : new Date(0).toISOString(),
                    } as UserValidIdRow);
                }
            }
        }

        return Array.from(byRequestId.values());
    },
};
