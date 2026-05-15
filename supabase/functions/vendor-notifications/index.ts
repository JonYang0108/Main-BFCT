/**
 * VSCode/tsserver sometimes doesn't load Deno globals for Supabase Functions files.
 * This keeps typechecking from erroring while not affecting runtime (where `Deno` exists).
 */
declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

type NotificationType = "system" | "payment_due" | "overdue" | "warning";
type RecipientScope = "all" | "specific";
type AutomationType = "due_dates" | "rent_reminders" | "warnings";

interface VendorRecipient {
  email: string;
  full_name: string;
  user_id: string;
}

interface DispatchResult {
  deliveredEmails: number;
  deliveredNotifications: number;
  errors: string[];
  skippedEmails: number;
  success: boolean;
  warnings: string[];
}

interface ManualPayload {
  action: "manual";
  message: string;
  recipientScope: RecipientScope;
  title: string;
  type: NotificationType;
  vendorIds?: string[];
}

interface AutomationPayload {
  action: "automation";
  automationType: AutomationType;
}

type RequestPayload = ManualPayload | AutomationPayload;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function createResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// ✅ Fixed: HTML entities were corrupted, replaced with unicode escapes
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(title: string, message: string, recipientName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <div style="padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb; background: #ffffff;">
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">BFCT Bagsakan Hub</p>
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">${
    escapeHtml(title)
  }</h1>
        <p style="margin: 0 0 16px; font-size: 15px;">Hello ${
    escapeHtml(recipientName)
  },</p>
        <p style="margin: 0 0 24px; line-height: 1.6; white-space: pre-wrap;">${
    escapeHtml(message)
  }</p>
        <p style="margin: 0; color: #6b7280; font-size: 13px;">This message was sent from the Bagsakan Hub admin dashboard.</p>
      </div>
    </div>
  `;
}

function getDueDate(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 5));
}

function differenceInDays(left: Date, right: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((left.getTime() - right.getTime()) / millisecondsPerDay);
}

Deno.serve(async (request: Request): Promise<Response> => {
  // ✅ Fixed: OPTIONS returns 200 not 204
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ✅ Fixed: env vars moved inside handler, top-level throw crashed
  // the function before Deno.serve() ran, breaking OPTIONS preflight
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return createResponse(
      { error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  async function verifyAdmin() {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.replace("Bearer ", "");

    if (!token) throw new HttpError(401, "Missing authorization token.");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new HttpError(401, "Unauthorized request.");

    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      throw new HttpError(403, "Admin access is required.");
    }
  }

  async function getActiveVendors(vendorIds?: string[]) {
    let query = supabase
      .from("v_active_vendors")
      .select("user_id, full_name, email");

    if (vendorIds && vendorIds.length > 0) {
      query = query.in("user_id", vendorIds);
    }

    const { data, error } = await query.order("full_name", { ascending: true });
    if (error) throw error;

    return (data ?? []) as VendorRecipient[];
  }

  async function sendEmails(
    recipients: VendorRecipient[],
    title: string,
    message: string,
  ) {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") ??
      "admin@bfctbagsakan.online";

    if (!resendApiKey) {
      return {
        deliveredEmails: 0,
        errors: [] as string[],
        skippedEmails: recipients.length,
        warnings: [
          "Email delivery skipped because RESEND_API_KEY is not configured.",
        ],
      };
    }

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailFrom,
              html: buildEmailHtml(title, message, recipient.full_name),
              subject: title,
              text: `${title}\n\nHello ${recipient.full_name},\n\n${message}`,
              to: [recipient.email],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              error: `${recipient.email}: ${errorText}`,
              success: false,
            };
          }

          return { success: true };
        } catch (error) {
          return {
            error: `${recipient.email}: ${
              error instanceof Error
                ? error.message
                : "Unexpected email delivery error."
            }`,
            success: false,
          };
        }
      }),
    );

    return {
      deliveredEmails: results.filter((r) => r.success).length,
      errors: results
        .filter((r) => !r.success)
        .map((r) => r.error ?? "Unknown email delivery error."),
      skippedEmails: 0,
      warnings: [] as string[],
    };
  }

  async function createNotifications(
    recipients: VendorRecipient[],
    title: string,
    message: string,
    type: NotificationType,
  ) {
    if (recipients.length === 0) return 0;

    const { error } = await supabase.from("notifications").insert(
      recipients.map((recipient) => ({
        message,
        title,
        type,
        user_id: recipient.user_id,
      })),
    );

    if (error) throw error;
    return recipients.length;
  }

  async function dispatchToRecipients(
    recipients: VendorRecipient[],
    title: string,
    message: string,
    type: NotificationType,
  ): Promise<DispatchResult> {
    if (recipients.length === 0) {
      return {
        deliveredEmails: 0,
        deliveredNotifications: 0,
        errors: [],
        skippedEmails: 0,
        success: true,
        warnings: ["No matching vendor recipients were found."],
      };
    }

    const deliveredNotifications = await createNotifications(
      recipients,
      title,
      message,
      type,
    );
    const emailResults = await sendEmails(recipients, title, message);

    return {
      deliveredEmails: emailResults.deliveredEmails,
      deliveredNotifications,
      errors: emailResults.errors,
      skippedEmails: emailResults.skippedEmails,
      success: emailResults.errors.length === 0,
      warnings: emailResults.warnings,
    };
  }

  async function resolveAutomationRecipients(type: AutomationType) {
    if (type === "rent_reminders") {
      return {
        message:
          "This is your monthly rent reminder. Please prepare your stall payment before the next due date.",
        recipients: await getActiveVendors(),
        title: "Monthly Rent Reminder",
        type: "payment_due" as const,
      };
    }

    const { data: payments, error } = await supabase
      .from("payments")
      .select("vendor_id, period_month, period_year, status")
      .in("status", ["pending", "overdue"]);

    if (error) throw error;

    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    const matchingVendorIds = new Set<string>();

    for (const payment of payments ?? []) {
      const dueDate = getDueDate(payment.period_year, payment.period_month);
      const daysUntilDue = differenceInDays(dueDate, todayUtc);

      if (type === "due_dates" && daysUntilDue >= 0 && daysUntilDue <= 3) {
        matchingVendorIds.add(payment.vendor_id);
      }

      if (
        type === "warnings" &&
        (payment.status === "overdue" ||
          differenceInDays(todayUtc, dueDate) > 0)
      ) {
        matchingVendorIds.add(payment.vendor_id);
      }
    }

    const recipients = await getActiveVendors(Array.from(matchingVendorIds));

    if (type === "warnings") {
      return {
        message:
          "Your account has an overdue payment. Please settle the balance immediately or contact the office for assistance.",
        recipients,
        title: "Overdue Payment Warning",
        type: "warning" as const,
      };
    }

    return {
      message:
        "Your payment due date is approaching. Please settle your stall balance on or before the deadline.",
      recipients,
      title: "Payment Due Soon",
      type: "payment_due" as const,
    };
  }

  try {
    await verifyAdmin();

    const payload = (await request.json()) as RequestPayload;

    if (payload.action === "manual") {
      const recipients = payload.recipientScope === "all"
        ? await getActiveVendors()
        : await getActiveVendors(payload.vendorIds ?? []);

      const result = await dispatchToRecipients(
        recipients,
        payload.title,
        payload.message,
        payload.type,
      );

      return createResponse(result);
    }

    const automation = await resolveAutomationRecipients(
      payload.automationType,
    );
    const result = await dispatchToRecipients(
      automation.recipients,
      automation.title,
      automation.message,
      automation.type,
    );

    return createResponse({
      ...result,
      automationType: payload.automationType,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return createResponse({ error: error.message }, { status: error.status });
    }
    return createResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
});
