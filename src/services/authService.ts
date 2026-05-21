import { type Session, type User } from "@supabase/supabase-js";

import { fileService } from "@/services/fileService";
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  supabase,
} from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type {
  AppRole,
  AuthLoginResult,
  AuthRegisterResult,
  AuthUserContext,
  ProfileRow,
  RegisterVendorInput,
} from "@/types/domain";

const rolePriority: readonly AppRole[] = ["admin", "staff", "vendor"];

function normalizeRole(role: string | null | undefined): AppRole | null {
  return rolePriority.find((candidate) => candidate === role) ?? null;
}

function resolvePrimaryRole(rows: Array<{ role: string }>): AppRole | null {
  for (const role of rolePriority) {
    if (rows.some((row) => row.role === role)) {
      return role;
    }
  }

  return null;
}

function normalizeRoleFromProfiles(
  role: string | null | undefined,
): AppRole | null {
  return normalizeRole(role);
}

async function fetchProfileAndRole(userId: string): Promise<AuthUserContext> {
  const [
    { data: profile, error: profileError },
    { data: roleRows, error: rolesError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  if (profileError) {
    throw toAppError(profileError, "Failed to load your profile.");
  }

  if (rolesError) {
    throw toAppError(rolesError, "Failed to load your account role.");
  }

  const resolvedFromProfiles = normalizeRoleFromProfiles(profile?.role);

  // Important: if profiles.role exists, treat it as the source of truth.
  // This prevents mis-routing when user_roles contains extra role rows.
  return {
    profile: profile ?? null,
    role: resolvedFromProfiles ??
      resolvePrimaryRole((roleRows ?? []).map((r) => ({ role: r.role }))),
  };
}

function ensureActiveAccount(profile: ProfileRow | null): void {
  if (!profile) {
    throw new Error("Your account profile could not be found.");
  }

  if (profile.account_status === "pending") {
    throw new Error("Your account is still pending approval.");
  }

  if (profile.account_status === "declined") {
    throw new Error("Your account request was declined.");
  }

  if (profile.account_status === "suspended") {
    throw new Error("Your account has been suspended.");
  }
}

async function finalizeAuthenticatedUser(
  session: Session,
  user: User,
): Promise<AuthLoginResult> {
  const context = await fetchProfileAndRole(user.id);

  try {
    ensureActiveAccount(context.profile);
  } catch (error) {
    await supabase.auth.signOut();
    throw error;
  }

  if (!context.role) {
    await supabase.auth.signOut();
    throw new Error("Your account does not have an assigned role yet.");
  }

  return {
    profile: context.profile,
    role: context.role,
    session,
    user,
  };
}

export const authService = {
  async getCurrentUserContext(): Promise<
    {
      session: Session | null;
      user: User | null;
    } & AuthUserContext
  > {
    const session = await getSession();
    const user = session?.user ?? (await getCurrentUser());

    if (!user) {
      return {
        profile: null,
        role: null,
        session: null,
        user: null,
      };
    }

    const context = await fetchProfileAndRole(user.id);

    return {
      ...context,
      session,
      user,
    };
  },

  async login(email: string, password: string): Promise<AuthLoginResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw toAppError(error, "Unable to sign in.");
    }

    if (!data.session || !data.user) {
      throw new Error("Login completed without an active session.");
    }

    return finalizeAuthenticatedUser(data.session, data.user);
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw toAppError(error, "Failed to sign out.");
    }
  },

  onAuthStateChange,

  async register(input: RegisterVendorInput): Promise<AuthRegisterResult> {
    // Rate limited signup through Edge Function
    const { data, error } = await supabase.functions.invoke(
      "rate-limited-signup",
      {
        body: {
          email: input.email.trim(),
          password: input.password,
          fullName: input.fullName.trim(),
          birthdate: input.birthdate,
          address: input.address.trim(),
          contactNumber: input.contactNumber.trim(),
        },
      },
    );

    if (error) {
      throw toAppError(error, "Unable to register your account.");
    }

    // Edge function may return { error: string, code?: string }
    if (data?.error) {
      throw new Error(String(data.error));
    }

    // Edge Function returns { userId }
    if (!data?.userId) {
      throw new Error("Registration completed without a user record.");
    }

    // NOTE: Your app currently expects uploads to happen right after signup.
    // Even if session is missing, file uploads will work as long as the user
    // is authenticated for storage requests.
    // For this flow, we proceed with uploads the same way the old code did.
    // If your Supabase auth settings block sessions until email confirmation,
    // the uploads must be handled by authenticated requests or a different approach.
    // Keeping the original behavior check but adapt to edge response.
    if (!data?.session) {
      // Previous code required data.session for uploads; however your original
      // comment says uploads can still work even if session is missing.
      // So we do NOT fail here.
    }

    const ID_UPLOAD_TIMEOUT_MS = 20000; // prevent net::ERR_TIMED_OUT in slow networks

    const withTimeout = async <T>(promise: Promise<T>, ms: number) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`ID upload timed out after ${ms}ms`));
          }, ms);
        });

        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    try {
      // Upload the two IDs in parallel to reduce total wait time.
      await Promise.all(
        input.idFiles.map((file) =>
          withTimeout(
            fileService.uploadValidId(file, data.userId),
            ID_UPLOAD_TIMEOUT_MS,
          )
        ),
      );
    } catch (uploadError) {
      await supabase.auth.signOut();
      throw toAppError(
        uploadError,
        "Your account was created, but the ID upload did not finish successfully (please try again).",
      );
    }

    await supabase.auth.signOut();

    return {
      message:
        "Registration submitted for approval. You will be notified once approved.",
    };
  },
};

export { fetchProfileAndRole, normalizeRole };
