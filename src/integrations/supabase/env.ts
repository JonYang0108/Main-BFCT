import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "VITE_SUPABASE_ANON_KEY is required"),
  VITE_SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid URL")
    .refine(
      (value) =>
        value.startsWith("https://") ||
        value.startsWith("http://127.0.0.1:") ||
        value.startsWith("http://localhost:"),
      "VITE_SUPABASE_URL must use https:// or a local Supabase URL",
    ),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`[supabase] Invalid environment configuration. ${details}`);
}

export const supabaseEnv = parsedEnv.data;
