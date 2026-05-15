import { supabase } from "@/integrations/supabase/client";
import { toAppError } from "@/lib/supabaseError";
import { fileService } from "@/services/fileService";

import type {
  CreatePaymentInput,
  DashboardRecentPayment,
  PaymentUpdate,
  PaymentRecord,
  PaymentStatus,
} from "@/types/domain";

function toPaymentStatus(status: string | null | undefined): PaymentStatus {
  if (status === "paid" || status === "pending" || status === "overdue") {
    return status;
  }

  return "pending";
}

function mapEnrichedPaymentRow(row: {
  amount: number | null;
  approved_at: string | null;
  approved_by: string | null;
  business_name: string | null;
  created_at: string | null;
  due_date: string | null;
  id: string | null;
  notes: string | null;
  payment_date: string | null;
  payment_method: string | null;
  period_label: string | null;
  period_month: number | null;
  period_year: number | null;
  phone: string | null;
  receipt_number: string | null;
  receipt_url: string | null;
  stall_id: string | null;
  stall_location: string | null;
  stall_number: string | null;
  status: string | null;
  updated_at: string | null;
  vendor_email: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
}): PaymentRecord {
  return {
    amount: row.amount ?? 0,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    businessName: row.business_name,
    createdAt: row.created_at,
    dueDate: row.due_date,
    id: row.id ?? "",
    notes: row.notes,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    periodLabel: row.period_label,
    periodMonth: row.period_month,
    periodYear: row.period_year,
    receiptNumber: row.receipt_number,
    receiptUrl: row.receipt_url,
    stallId: row.stall_id,
    stallLocation: row.stall_location,
    stallNumber: row.stall_number,
    status: toPaymentStatus(row.status),
    updatedAt: row.updated_at,
    vendorEmail: row.vendor_email,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    vendorPhone: row.phone,
  };
}

function mapStaffPaymentRow(row: {
  amount: number | null;
  created_at: string | null;
  due_date: string | null;
  id: string | null;
  notes: string | null;
  payment_date: string | null;
  payment_method: string | null;
  period_label: string | null;
  period_month: number | null;
  period_year: number | null;
  receipt_number: string | null;
  stall_number: string | null;
  status: string | null;
  vendor_name: string | null;
}): PaymentRecord {
  return {
    amount: row.amount ?? 0,
    approvedAt: null,
    approvedBy: null,
    businessName: null,
    createdAt: row.created_at,
    dueDate: row.due_date,
    id: row.id ?? "",
    notes: row.notes,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    periodLabel: row.period_label,
    periodMonth: row.period_month,
    periodYear: row.period_year,
    receiptNumber: row.receipt_number,
    receiptUrl: null,
    stallId: null,
    stallLocation: null,
    stallNumber: row.stall_number,
    status: toPaymentStatus(row.status),
    updatedAt: row.created_at,
    vendorEmail: null,
    vendorId: null,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    vendorPhone: null,
  };
}

export const paymentService = {
  async addPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        amount: input.amount,
        notes: input.notes ?? null,
        payment_date: input.paymentDate,
        payment_method: input.paymentMethod,
        period_month: input.periodMonth,
        period_year: input.periodYear,
        receipt_number: input.receiptNumber ?? null,
        receipt_url: input.receiptUrl ?? null,
        stall_id: input.stallId,
        status: input.status ?? "pending",
        vendor_id: input.vendorId,
      })
      .select("*")
      .single();

    if (error) {
      throw toAppError(error, "Unable to record the payment.");
    }

    const details = await this.listPayments({
      vendorId: data.vendor_id,
    });

    return (
      details.find((payment) => payment.id === data.id) ?? {
        amount: data.amount,
        approvedAt: data.approved_at,
        approvedBy: data.approved_by,
        businessName: null,
        createdAt: data.created_at,
        dueDate: data.due_date,
        id: data.id,
        notes: data.notes,
        paymentDate: data.payment_date,
        paymentMethod: data.payment_method,
        periodLabel: `${data.period_month}/${data.period_year}`,
        periodMonth: data.period_month,
        periodYear: data.period_year,
        receiptNumber: data.receipt_number,
        receiptUrl: data.receipt_url,
        stallId: data.stall_id,
        stallLocation: null,
        stallNumber: null,
        status: toPaymentStatus(data.status),
        updatedAt: data.updated_at,
        vendorEmail: null,
        vendorId: data.vendor_id,
        vendorName: "Unknown Vendor",
        vendorPhone: null,
      }
    );
  },

  async createPayment(paymentData: {
    amount: number;
    notes?: string;
    paymentMethod: string;
    periodMonth: number;
    periodYear: number;
    referenceNumber?: string;
    stallId: string;
  }) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw toAppError(error, "Unable to load the signed-in account.");
    }

    if (!user) {
      throw new Error("Not authenticated");
    }

    return this.addPayment({
      amount: paymentData.amount,
      notes: paymentData.notes,
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentData.paymentMethod,
      periodMonth: paymentData.periodMonth,
      periodYear: paymentData.periodYear,
      stallId: paymentData.stallId,
      status:
        paymentData.paymentMethod.toLowerCase() === "cash" ? "pending" : "paid",
      vendorId: user.id,
    });
  },

  async downloadReceipt(receiptUrl: string) {
    const response = await fetch(receiptUrl);

    if (!response.ok) {
      throw new Error("Failed to download receipt");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `receipt-${Date.now()}`;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  },

  async getUserPayments(userId?: string): Promise<PaymentRecord[]> {
    let targetUserId = userId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      throw new Error("No user ID available");
    }

    return this.listPayments({ vendorId: targetUserId });
  },

  async listAdminPayments(options?: {
    month?: number;
    search?: string;
    status?: string;
    year?: number;
  }): Promise<PaymentRecord[]> {
    const { data, error } = await supabase.rpc("fn_admin_payments_list", {
      _month: options?.month ?? null,
      _search: options?.search?.trim() || null,
      _status: options?.status?.trim() || null,
      _year: options?.year ?? null,
    });

    if (error) {
      throw toAppError(error, "Unable to load payment records.");
    }

    return (data ?? []).map(mapEnrichedPaymentRow);
  },

  async listPayments(options?: {
    limit?: number;
    search?: string;
    status?: string;
    vendorId?: string;
    year?: number;
    month?: number;
  }): Promise<PaymentRecord[]> {
    if (options?.vendorId) {
      const { data, error } = await supabase.rpc("fn_vendor_payments", {
        _vendor_id: options.vendorId,
      });

      if (error) {
        throw toAppError(error, "Unable to load vendor payments.");
      }

      const payments = (data ?? []).map(mapEnrichedPaymentRow);
      return options.status
        ? payments.filter((payment) => payment.status === options.status)
        : payments;
    }

    return this.listAdminPayments(options);
  },

  async listStaffPayments(options?: {
    period?: string;
    search?: string;
    status?: string;
  }): Promise<PaymentRecord[]> {
    const { data, error } = await supabase.rpc("fn_staff_payment_records", {
      _period: options?.period?.trim() || null,
      _search: options?.search?.trim() || null,
      _status: options?.status?.trim() || null,
    });

    if (error) {
      throw toAppError(error, "Unable to load staff payment records.");
    }

    return (data ?? []).map(mapStaffPaymentRow);
  },

  async listRecentPayments(limit = 5): Promise<DashboardRecentPayment[]> {
    const { data, error } = await supabase.rpc("fn_recent_payments", {
      _limit: limit,
    });

    if (error) {
      throw toAppError(error, "Unable to load recent payments.");
    }

    return (data ?? []).map((payment) => ({
      amount: payment.amount ?? 0,
      id: payment.id ?? "",
      paymentDate: payment.payment_date ?? "",
      paymentMethod: payment.payment_method ?? "",
      periodLabel: payment.period_label ?? "",
      receiptNumber: payment.receipt_number ?? "",
      stallNumber: payment.stall_number ?? "",
      status: toPaymentStatus(payment.status),
      vendorEmail: payment.vendor_email ?? "",
      vendorName: payment.vendor_name ?? "Unknown Vendor",
    }));
  },

  async updatePayment(paymentId: string, updates: PaymentUpdate) {
    const { error } = await supabase
      .from("payments")
      .update(updates)
      .eq("id", paymentId);

    if (error) {
      throw toAppError(error, "Unable to update the payment.");
    }
  },

  async uploadReceipt(paymentId: string, file: File) {
    return fileService.uploadReceipt(paymentId, file);
  },
};
