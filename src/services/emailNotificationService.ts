import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import { vendorService } from "@/services/vendorService";
import type {
  NotificationAutomationResult,
  NotificationAutomationType,
  NotificationDispatchPayload,
  NotificationDispatchResult,
  NotificationMessageType,
  VendorOption,
} from "@/types/domain";

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : null))
    .filter((v): v is string => v !== null);
}

function toNotificationDispatchResult(
  raw: Record<string, unknown>,
): NotificationDispatchResult {
  return {
    success: asBoolean(raw.success),
    deliveredNotifications: asNumber(raw.deliveredNotifications),
    deliveredEmails: asNumber(raw.deliveredEmails),
    skippedEmails: asNumber(raw.skippedEmails),
    errors: asStringArray(raw.errors),
    warnings: asStringArray(raw.warnings),
  };
}

function toNotificationAutomationResult(
  raw: Record<string, unknown>,
  automationType: NotificationAutomationType,
): NotificationAutomationResult {
  return {
    ...toNotificationDispatchResult(raw),
    automationType,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export const emailNotificationService = {
  async getAllVendors(): Promise<VendorOption[]> {
    return vendorService.listActiveVendors();
  },

  async runAutomation(
    automationType: NotificationAutomationType,
  ): Promise<NotificationAutomationResult> {
    const { data, error } = await supabase.functions.invoke(
      "vendor-notifications",
      {
        body: {
          action: "automation",
          automationType,
        },
      },
    );

    if (error) {
      throw toAppError(error, "Unable to run vendor notification automation.");
    }

    return toNotificationAutomationResult(toRecord(data), automationType);
  },

  async sendManualNotification(
    payload: NotificationDispatchPayload,
  ): Promise<NotificationDispatchResult> {
    const { data, error } = await supabase.functions.invoke(
      "vendor-notifications",
      {
        body: {
          action: "manual",
          message: payload.message,
          recipientScope: payload.recipientScope,
          title: payload.title,
          type: payload.type,
          vendorIds: payload.vendorIds ?? [],
        },
      },
    );

    if (error) {
      throw toAppError(error, "Unable to send the vendor notification.");
    }

    return toNotificationDispatchResult(toRecord(data));
  },

  async sendToAllVendors(
    title: string,
    message: string,
    type: NotificationMessageType = "system",
  ): Promise<NotificationDispatchResult> {
    return this.sendManualNotification({
      recipientScope: "all",
      title,
      message,
      type,
    });
  },

  async sendToSelectedVendors(
    vendorIds: string[],
    title: string,
    message: string,
    type: NotificationMessageType = "system",
  ): Promise<NotificationDispatchResult> {
    return this.sendManualNotification({
      recipientScope: "specific",
      vendorIds,
      title,
      message,
      type,
    });
  },

  async sendToSpecificVendor(
    vendorId: string,
    title: string,
    message: string,
    type: NotificationMessageType = "system",
  ): Promise<NotificationDispatchResult> {
    return this.sendManualNotification({
      recipientScope: "specific",
      vendorIds: [vendorId],
      title,
      message,
      type,
    });
  },
};

