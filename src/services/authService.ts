import { type Session, type User } from "@supabase/supabase-js";

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

const rolePriority: readonly AppRole[] = [
  "admin",
  "staff",
  "vendor",
];

function normalizeRole(
  role: string | null | undefined,
): AppRole | null {
  return (
    rolePriority.find(
      (candidate) => candidate === role,
    ) ?? null
  );
}

function resolvePrimaryRole(
  rows: Array<{ role: string }>,
): AppRole | null {
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

async function fetchProfileAndRole(
  userId: string,
): Promise<AuthUserContext> {
  const [
    { data: profile, error: profileError },
    { data: roleRows, error: rolesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);

  if (profileError) {
    throw toAppError(
      profileError,
      "Failed to load your profile.",
    );
  }

  if (rolesError) {
    throw toAppError(
      rolesError,
      "Failed to load your account role.",
    );
  }

  const resolvedFromProfiles = normalizeRoleFromProfiles(profile?.role);

  return {
    profile: profile ?? null,

    role: resolvedFromProfiles ??
      resolvePrimaryRole(
        (roleRows ?? []).map((r) => ({
          role: r.role,
        })),
      ),
  };
}

function ensureActiveAccount(
  profile: ProfileRow | null,
): void {
  if (!profile) {
    throw new Error(
      "Your account profile could not be found.",
    );
  }

  if (profile.account_status === "pending") {
    throw new Error(
      "Your account is still pending approval.",
    );
  }

  if (profile.account_status === "declined") {
    throw new Error(
      "Your account request was declined.",
    );
  }

  if (profile.account_status === "suspended") {
    throw new Error(
      "Your account has been suspended.",
    );
  }
}

async function finalizeAuthenticatedUser(
  session: Session,
  user: User,
): Promise<AuthLoginResult> {
  const context = await fetchProfileAndRole(
    user.id,
  );

  try {
    ensureActiveAccount(context.profile);
  } catch (error) {
    await supabase.auth.signOut();
    throw error;
  }

  if (!context.role) {
    await supabase.auth.signOut();

    throw new Error(
      "Your account does not have an assigned role yet.",
    );
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

    const user = session?.user ??
      (await getCurrentUser());

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

  async login(
    email: string,
    password: string,
  ): Promise<AuthLoginResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw toAppError(
        error,
        "Unable to sign in.",
      );
    }

    if (!data.session || !data.user) {
      throw new Error(
        "Login completed without an active session.",
      );
    }

    return finalizeAuthenticatedUser(
      data.session,
      data.user,
    );
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw toAppError(
        error,
        "Failed to sign out.",
      );
    }
  },

  onAuthStateChange,

  async register(
    input: RegisterVendorInput,
  ): Promise<AuthRegisterResult> {
    // CREATE AUTH USER
    const {
      data: signupData,
      error: signupError,
    } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,

      options: {
        data: {
          full_name: input.fullName.trim(),
          contact_number: input.contactNumber.trim(),
          phone: input.contactNumber.trim(),
          address: input.address.trim(),
          birthdate: input.birthdate,
        },
      },
    });

    if (signupError) {
      throw toAppError(
        signupError,
        "Unable to register your account.",
      );
    }

    // GET USER ID
    const userId = signupData.user?.id ??
      signupData.session?.user?.id;

    console.log("SIGNUP USER:", userId);

    if (!userId) {
      throw new Error(
        "Authenticated user not found after signup.",
      );
    }

    try {
      // SIGN OUT
      await supabase.auth.signOut();

      return {
        message:
          "Registration submitted successfully. Please wait for admin approval.",
      };
    } catch (error) {
      console.error(
        "REGISTRATION ERROR:",
        error,
      );

      await supabase.auth.signOut();

      throw toAppError(
        error,
        "Unable to complete registration.",
      );
    }
  },
};

export { fetchProfileAndRole, normalizeRole };
