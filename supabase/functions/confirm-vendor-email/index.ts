import { createClient } from "@supabase/supabase-js"; // ✅ CORRECT
import { corsHeaders } from "../_shared/cors.ts";

interface DenoNamespace {
  env: {
    get(key: string): string | undefined;
  };
  serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare const Deno: DenoNamespace;

function createResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) {
    throw new HttpError(500, `Missing ${name}`, "ENV_MISSING");
  }
  return val;
}

function validateUserId(userId: unknown): string {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new HttpError(400, "userId is required", "BAD_REQUEST");
  }
  return userId.trim();
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body", "BAD_JSON");
  }
}

// This function uses the Supabase service role key.
// It should be called by an admin-only UI.
Deno.serve(async (request: Request): Promise<Response> => {
  try {
    // Preflight must return 2xx and proper CORS headers.
    // Use createResponse so CORS headers are always included.
    if (request.method === "OPTIONS") {
      return createResponse("ok", { status: 200 });
    }

    if (request.method !== "POST") {
      throw new HttpError(
        405,
        "Method not allowed",
        "METHOD_NOT_ALLOWED",
      );
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const body = await parseJsonBody(request);
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Invalid request body", "BAD_REQUEST");
    }

    const record = body as Record<string, unknown>;
    const userId = validateUserId(record.userId);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Confirm email so the user can sign in.
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      throw new HttpError(
        500,
        error.message ?? "Failed to confirm email",
        "CONFIRM_FAILED",
      );
    }

    return createResponse({ ok: true, userId }, { status: 200 });
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(
      500,
      e instanceof Error ? e.message : "Internal server error",
      "UNKNOWN",
    );

    return createResponse(
      {
        error: err.message,
        code: err.code,
      },
      { status: err.status ?? 500 },
    );
  }
});
