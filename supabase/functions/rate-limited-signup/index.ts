import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type Payload = {
  email: string;
  password: string;
  fullName: string;
  birthdate: string;
  address: string;
  contactNumber: string;
};

// Minimal Deno typing for env/serve access (avoid `any` to satisfy no-explicit-any)
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

function validateEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new HttpError(400, "Invalid email format", "INVALID_EMAIL");
  }
  return trimmed;
}

function parseIpAddress(request: Request): string | null {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const ip = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip");
  return ip ?? null;
}

async function rateLimit(opts: {
  supabase: SupabaseClient;
  email: string;
  ipAddress: string | null;
  limit: number;
  windowMs: number;
}) {
  const { supabase, email, ipAddress, limit, windowMs } = opts;

  const now = Date.now();
  const windowStart = new Date(now - (now % windowMs)).toISOString();

  const { count: emailCount } = await supabase
    .from("signup_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("window_start", windowStart);

  const { count: ipCount } = ipAddress
    ? await supabase
      .from("signup_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .eq("window_start", windowStart)
    : { count: 0 };

  const safeEmailCount = typeof emailCount === "number" ? emailCount : 0;
  const safeIpCount = typeof ipCount === "number" ? ipCount : 0;

  if (safeEmailCount >= limit || safeIpCount >= limit) {
    throw new HttpError(
      429,
      "Too many requests. Rate limit exceeded",
      "RATE_LIMIT_EXCEEDED",
    );
  }

  const { error: upsertError } = await supabase
    .from("signup_rate_limits")
    .upsert(
      {
        email,
        ip_address: ipAddress,
        window_start: windowStart,
        attempt_count: 1,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "email,ip_address,window_start",
      },
    );

  // Non-fatal: do not block signups due to tracking issues.
  if (upsertError) {
    console.error("Rate limit tracking upsert failed:", upsertError);
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed", "METHOD_NOT_ALLOWED");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new HttpError(
        500,
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        "ENV_MISSING",
      );
    }

    const body = (await request.json().catch(() => null)) as
      | Partial<Payload>
      | null;
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Invalid JSON payload", "BAD_JSON");
    }

    const email = validateEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const birthdate = String(body.birthdate ?? "");
    const address = String(body.address ?? "").trim();
    const contactNumber = String(body.contactNumber ?? "").trim();

    if (!password || password.length < 6) {
      throw new HttpError(
        400,
        "Password is required and must be 6+ characters",
        "INVALID_PASSWORD",
      );
    }
    if (!fullName) {
      throw new HttpError(400, "fullName is required", "MISSING_FULL_NAME");
    }
    if (!birthdate) {
      throw new HttpError(400, "birthdate is required", "MISSING_BIRTHDATE");
    }
    if (!address) {
      throw new HttpError(400, "address is required", "MISSING_ADDRESS");
    }
    if (!contactNumber) {
      throw new HttpError(
        400,
        "contactNumber is required",
        "MISSING_CONTACT_NUMBER",
      );
    }

    const ipAddress = parseIpAddress(request);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3 attempts / 1 minute per email OR IP
    await rateLimit({
      supabase,
      email,
      ipAddress,
      limit: 3,
      windowMs: 60_000,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          address,
          birthdate,
          business_name: null,
          contact_number: contactNumber,
          full_name: fullName,
          phone: contactNumber,
        },
      },
    });

    if (error) {
      throw new HttpError(
        400,
        error.message || "Unable to register",
        "SIGNUP_FAILED",
      );
    }

    if (!data.user) {
      throw new HttpError(
        500,
        "Registration succeeded but no user returned",
        "NO_USER",
      );
    }

    return createResponse(
      {
        message:
          "Registration submitted for approval. You will be notified once approved.",
        userId: data.user.id,
      },
      { status: 200 },
    );
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(
      500,
      e instanceof Error ? e.message : "Internal server error",
      "UNKNOWN",
    );

    console.error(`[${err.code}]`, err.message, err);

    return createResponse(
      {
        error: err.message,
        code: err.code,
      },
      { status: err.status ?? 500 },
    );
  }
});
