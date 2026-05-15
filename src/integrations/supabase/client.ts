import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { supabaseEnv } from "@/integrations/supabase/env";
import type { Database } from "@/types/supabase";

let browserClient: SupabaseClient<Database> | null = null;

function createBrowserClient(): SupabaseClient<Database> {
  return createClient<Database>(
    supabaseEnv.VITE_SUPABASE_URL,
    supabaseEnv.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
      global: {
        headers: {
          "X-Client-Info": "bfctaxel-web",
        },
      },
    },
  );
}

export const supabase = browserClient ?? (browserClient = createBrowserClient());
export const supabaseAuth = supabase.auth;

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}

export default supabase;
