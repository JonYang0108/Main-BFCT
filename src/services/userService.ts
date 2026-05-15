import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import type { AppRole, ProfileRow, ProfileUpdate } from "@/types/domain";

export const userService = {
  async getProfile(userId?: string): Promise<ProfileRow | ProfileRow[] | null> {
    if (userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw toAppError(error, "Unable to load the user profile.");
      }

      return data ?? null;
    }

    const { data, error } = await supabase.from("profiles").select("*");

    if (error) {
      throw toAppError(error, "Unable to load profiles.");
    }

    return data ?? [];
  },

  async getUserRoles(userId?: string): Promise<AppRole[]> {
    let targetUserId = userId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return [];
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);

    if (error) {
      throw toAppError(error, "Unable to load user roles.");
    }

    return (data ?? [])
      .map((row) => row.role)
      .filter(
        (role): role is AppRole =>
          role === "admin" || role === "staff" || role === "vendor",
      );
  },

  async hasPermission(
    resource: string,
    action: string,
    userId?: string,
  ): Promise<boolean> {
    let targetUserId = userId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return false;
    }

    const { data, error } = await supabase.rpc("has_permission", {
      _action: action,
      _resource: resource,
      _user_id: targetUserId,
    });

    if (error) {
      throw toAppError(error, "Unable to evaluate permissions.");
    }

    return data ?? false;
  },

  async hasRole(role: AppRole, userId?: string): Promise<boolean> {
    let targetUserId = userId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return false;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _role: role,
      _user_id: targetUserId,
    });

    if (error) {
      throw toAppError(error, "Unable to evaluate the user role.");
    }

    return data ?? false;
  },

  async updateProfile(
    updates: ProfileUpdate & { user_id?: string },
  ): Promise<ProfileRow> {
    const { user_id, ...rest } = updates;
    if (!user_id) {
      throw new Error("updateProfile requires user_id");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(rest)
      .eq("user_id", user_id)
      .select("*")
      .single();

    if (error) {
      throw toAppError(error, "Unable to update the profile.");
    }

    return data;
  },
};
