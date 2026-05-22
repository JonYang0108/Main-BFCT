import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type {
    AccountRequestRecord,
    AccountStatus,
    ProfileRow,
    UserValidIdRow,
    VendorRequestStatus,
} from "@/types/domain";

// Permissive View row type (the generated Supabase types don't include
// v_account_requests_with_valid_ids reliably yet).
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
    if (
        status === "approved" || status === "declined" || status === "pending"
    ) {
        return status;
    }

    return "pending";
}

export const accountRequestServiceV2 = {
    async approveAccountRequest(requestId: string): Promise<void> {
        // Ensure vendor login gating works by updating profiles.account_status.
        // Use permissive typing for the view to avoid TS union 'never' errors.
        type ViewQueryClient = {
            from: (view: string) => {
                select: (cols: string) => {
                    eq: (
                        column: string,
                        value: string,
                    ) => {
                        maybeSingle: () => Promise<{
                            data: VAccountRequestsWithValidIdsRow | null;
                            error: unknown;
                        }>;
                    };
                };
            };
        };

        const viewClient = supabase as unknown as ViewQueryClient;

        const { data: requestRow, error: requestErr } = await viewClient
            .from("v_account_requests_with_valid_ids")
            .select("id,user_id")
            .eq("id", requestId)
            .maybeSingle();

        // Defensive: if requestId is not a UUID (or view row doesn't match), avoid updating with an invalid id.
        if (typeof requestId !== "string" || !requestId) {
            throw new Error("Invalid requestId.");
        }

        // Treat view row shape as permissive runtime data.
        // Use permissive runtime typing.
        if (requestErr) {
            throw toAppError(
                requestErr,
                "Unable to approve the account request.",
            );
        }

        const userId = requestRow?.user_id;
        if (!userId || typeof userId !== "string") {
            // Avoid throwing opaque errors from down-stream RPC/DB calls.
            throw new Error("Unable to approve: missing request user_id.");
        }

        // Activate vendor profile + provision vendor role so the
        // admin vendor lists/views (fn_admin_vendors_list / v_active_vendors)
        // can pick up this user.
        const { error: profileErr } = await supabase
            .from("profiles")
            .update({
                account_status: "active",
                role: "vendor" as any,
            })
            .eq("user_id", userId);

        if (profileErr) {
            throw toAppError(
                profileErr,
                "Unable to activate/provision the vendor profile.",
            );
        }

        // Ensure role record exists.
        // Using upsert semantics prevents duplicate role rows.
        const { error: roleErr } = await supabase
            .from("user_roles")
            .upsert(
                { user_id: userId, role: "vendor" as any },
                { onConflict: "user_id" },
            );

        if (roleErr) {
            // If onConflict doesn't match your unique constraint, fallback to insert.
            const { error: insertErr } = await supabase
                .from("user_roles")
                .insert({ user_id: userId, role: "vendor" as any });

            if (insertErr) {
                throw toAppError(
                    roleErr,
                    "Unable to provision vendor role for the approved account.",
                );
            }
        }

        // Critical: Supabase password login is blocked until the auth email
        // is confirmed. Approving the vendor profile in our tables is not
        // enough.
        // Confirm email via Edge Function (service-role on server).
        // This prevents 403 Forbidden from `supabase.auth.admin.*` in the browser.
        const { data: confirmData, error: confirmFnErr } = await supabase
            .functions.invoke("confirm-vendor-email", {
                body: { userId },
            });

        if (confirmFnErr) {
            throw toAppError(
                confirmFnErr,
                "Unable to confirm vendor email for login.",
            );
        }

        if (!confirmData?.ok) {
            throw new Error("Email confirmation did not complete.");
        }

        // NOTE: The admin view `v_account_requests_with_valid_ids` exposes
        // `vendor_requests.status` as both `status` and `account_status`.
        // So we must update the `status` column (not `account_status`).
        const { error: requestUpdateErr } = await supabase
            .from("vendor_requests")
            .update({ status: "approved" } as { status: "approved" })
            .eq("id", requestId);

        if (requestUpdateErr) {
            throw toAppError(
                requestUpdateErr,
                "Unable to update the vendor request.",
            );
        }
    },

    async declineAccountRequest(
        requestId: string,
        declineReason: string,
    ): Promise<void> {
        const { data: requestRow, error: requestErr } =
            await (supabase as unknown as {
                from: (view: string) => {
                    select: (cols: string) => {
                        eq: (column: string, value: string) => {
                            maybeSingle: () => Promise<{
                                data: VAccountRequestsWithValidIdsRow | null;
                                error: unknown;
                            }>;
                        };
                    };
                };
            })
                .from("v_account_requests_with_valid_ids")
                .select("id,user_id")
                .eq("id", requestId)
                .maybeSingle();

        if (requestErr) {
            throw toAppError(
                requestErr,
                "Unable to decline the account request.",
            );
        }

        const userId = requestRow?.user_id;
        if (!userId) {
            throw new Error("Unable to decline: missing request user_id.");
        }

        const { error: profileErr } = await supabase
            .from("profiles")
            .update({ account_status: "declined" })
            .eq("user_id", userId);

        if (profileErr) {
            throw toAppError(
                profileErr,
                "Unable to decline the vendor profile.",
            );
        }

        const { error: requestUpdateErr } = await supabase
            .from("vendor_requests")
            .update({
                status: "declined",
                decline_reason: declineReason,
            } as {
                status: "declined";
                decline_reason: string;
            })
            .eq("id", requestId);

        if (requestUpdateErr) {
            throw toAppError(
                requestUpdateErr,
                "Unable to update the vendor request.",
            );
        }
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
                    // Explicitly cast the whole object to avoid TS inferring
                    // `never` for `account_status` under RejectExcessProperties.
                    account_status: normalizeAccountStatus(
                        typeof row.account_status === "string"
                            ? row.account_status
                            : null,
                    ) as AccountStatus | null,

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
                } as AccountRequestRecord);
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
