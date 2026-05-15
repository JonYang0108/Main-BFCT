import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

type Action = "approved" | "declined";

type Payload = {
  action: Action;
  email: string;
  fullName: string;
  declineReason?: string;
  requestId: string;
};

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

function escapeHtml(value: string) {
  // Important: keep only correctly-quoted string literals
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(opts: {
  title: string;
  message: string;
  recipientName: string;
}) {
  const { title, message, recipientName } = opts;

  const htmlMessage = escapeHtml(message).replaceAll("\n", "<br />");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <div style="padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb; background: #ffffff;">
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">BFCT Bagsakan Hub</p>
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">${
    escapeHtml(
      title,
    )
  }</h1>
        <p style="margin: 0 0 16px; font-size: 15px;">Hello ${
    escapeHtml(
      recipientName,
    )
  },</p>
        <p style="margin: 0 0 24px; line-height: 1.6; white-space: normal;">${htmlMessage}</p>
        <p style="margin: 0; color: #6b7280; font-size: 13px;">This message was sent from the Bagsakan Hub admin dashboard.</p>
      </div>
    </div>
  `;
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
    throw new HttpError(400, `Invalid email: ${email}`, "INVALID_EMAIL");
  }
  return trimmed;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new HttpError(
        500,
        "Missing Supabase environment variables.",
        "ENV_MISSING",
      );
    }

    if (!resendApiKey || !emailFrom) {
      throw new HttpError(
        500,
        "Missing RESEND_API_KEY or EMAIL_FROM environment variables.",
        "RESEND_ENV_MISSING",
      );
    }

    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      throw new HttpError(401, "Missing authorization token.", "NO_AUTH_TOKEN");
    }

    const body = (await request.json().catch(() => null)) as
      | Partial<Payload>
      | null;

    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Invalid JSON payload.", "BAD_JSON");
    }

    const action = body.action as Action;
    if (!["approved", "declined"].includes(action)) {
      throw new HttpError(400, "Invalid action.", "INVALID_ACTION");
    }

    const email = validateEmail(String(body.email ?? ""));
    const fullName = String(body.fullName ?? "").trim();
    const declineReason = String(body.declineReason ?? "").trim();
    const requestId = String(body.requestId ?? "").trim();

    if (!fullName) {
      throw new HttpError(400, "fullName is required.", "MISSING_FULL_NAME");
    }
    if (!requestId) {
      throw new HttpError(400, "requestId is required.", "MISSING_REQUEST_ID");
    }
    if (action === "declined" && !declineReason) {
      throw new HttpError(
        400,
        "declineReason is required when declined.",
        "MISSING_DECLINE_REASON",
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new HttpError(401, "Unauthorized request.", "UNAUTHORIZED");
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "staff"])
      .maybeSingle();

    if (roleError || !roleRow) {
      throw new HttpError(403, "Admin/staff access required.", "FORBIDDEN");
    }

    const title = action === "approved"
      ? "Account Approved"
      : "Account Request Declined";

    const message = action === "approved"
      ? "Your vendor account has been approved. You can now sign in and access your Vendor dashboard."
      : `Your vendor account request was declined.\n\nReason: ${declineReason}\n\nIf you believe this is a mistake, please contact the office for assistance.`;

    const html = buildEmailHtml({
      title,
      message,
      recipientName: fullName,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: title,
        html,
        text: `${title}\n\nHello ${fullName},\n\n${message}`,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text().catch(() => "");
      throw new HttpError(
        502,
        `Resend failed: ${errorText || emailRes.statusText}`,
        "RESEND_FAILED",
      );
    }

    return createResponse({ ok: true, action, requestId });
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(
      500,
      e instanceof Error ? e.message : "Unexpected error",
      "UNKNOWN",
    );

    return createResponse(
      { ok: false, error: err.message, code: err.code },
      { status: err.status },
    );
  }
});
