import type { Session, User } from "@supabase/supabase-js";

import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/supabase";

export type AppRole = "admin" | "staff" | "vendor";
export type AccountStatus = Enums<"account_status">;
export type AnnouncementStatus = Enums<"announcement_status">;
export type NotificationMessageType = Enums<"notification_type">;
export type PaymentMethodKey = Enums<"payment_method">;
export type PaymentStatus = Enums<"payment_status">;
export type StallStatus = Enums<"stall_status">;
export type VendorRequestStatus = Enums<"vendor_request_status">;

export type ProfileRow = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type UserRoleRow = Tables<"user_roles">;
export type UserValidIdRow = Tables<"user_valid_ids">;
export type VendorRequestRow = Tables<"vendor_requests">;
export type StallRow = Tables<"stalls">;
export type StallInsert = TablesInsert<"stalls">;
export type StallUpdate = TablesUpdate<"stalls">;
export type PaymentRow = Tables<"payments">;
export type PaymentInsert = TablesInsert<"payments">;
export type PaymentUpdate = TablesUpdate<"payments">;
export type AnnouncementRow = Tables<"announcements">;
export type NotificationRow = Tables<"notifications">;
export type ActiveVendorViewRow = Tables<"v_active_vendors">;
export type AccountRequestViewRow = Tables<"v_account_requests">;
export type StallsListViewRow = Tables<"v_stalls_list">;
export type PaymentsEnrichedViewRow = Tables<"v_payments_enriched">;
export type VendorOverviewViewRow = Tables<"v_vendor_overview">;

export interface AuthContextValue {
  loading: boolean;
  profile: ProfileRow | null;
  refresh: () => Promise<void>;
  role: AppRole | null;
  session: Session | null;
  signOut: () => Promise<void>;
  user: User | null;
}

export interface AuthUserContext {
  profile: ProfileRow | null;
  role: AppRole | null;
}

export interface RegisterVendorInput {
  address: string;
  birthdate: string;
  contactNumber: string;
  email: string;
  fullName: string;
  idFiles: File[];
  password: string;
}

export interface AuthLoginResult extends AuthUserContext {
  session: Session;
  user: User;
}

export interface AuthRegisterResult {
  message: string;
}

export interface VendorOption {
  accountStatus: AccountStatus;
  address: string | null;
  businessName: string | null;
  createdAt: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  role: AppRole | null;
  stallId: string | null;
  stallNumber: string | null;
  userId: string;
}

export interface PaymentRecord {
  amount: number;
  approvedAt: string | null;
  approvedBy: string | null;
  businessName: string | null;
  createdAt: string | null;
  dueDate: string | null;
  id: string;
  notes: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  periodLabel: string | null;
  periodMonth: number | null;
  periodYear: number | null;
  receiptNumber: string | null;
  receiptUrl: string | null;
  stallId: string | null;
  stallLocation: string | null;
  stallNumber: string | null;
  status: PaymentStatus;
  updatedAt: string | null;
  vendorEmail: string | null;
  vendorId: string | null;
  vendorName: string;
  vendorPhone: string | null;
}

export interface DashboardRecentPayment {
  amount: number;
  id: string;
  paymentDate: string;
  paymentMethod: string;
  periodLabel: string;
  receiptNumber: string;
  stallNumber: string;
  status: PaymentStatus;
  vendorEmail: string;
  vendorName: string;
}

export interface AnnouncementFormValues {
  content: string;
  status: AnnouncementStatus;
  title: string;
}

export interface AccountRequestRecord {
  account_status: AccountStatus | null;
  address: string;
  birthdate: string | null;
  business_name: string | null;
  contact_number: string | null;
  created_at: string;
  decline_reason: string | null;
  email: string;
  full_name: string;
  id: string;
  phone: string;
  profile: ProfileRow | null;
  status: VendorRequestStatus;
  updated_at: string;
  user_id: string;
  validIds: UserValidIdRow[];
}

export interface CreatePaymentInput {
  amount: number;
  notes?: string | null;
  paymentDate: string;
  paymentMethod: string;
  periodMonth: number;
  periodYear: number;
  receiptNumber?: string | null;
  receiptUrl?: string | null;
  stallId: string;
  status?: PaymentStatus;
  vendorId: string;
}

export interface CreateVendorInput {
  address?: string;
  businessName?: string;
  email: string;
  fullName: string;
  password: string;
  phone?: string;
}

export type NotificationRecipientScope = "all" | "specific";
export type NotificationAutomationType =
  | "due_dates"
  | "rent_reminders"
  | "warnings";

export interface NotificationDispatchPayload {
  message: string;
  recipientScope: NotificationRecipientScope;
  title: string;
  type: NotificationMessageType;
  vendorIds?: string[];
}

export interface NotificationDispatchResult {
  deliveredEmails: number;
  deliveredNotifications: number;
  errors: string[];
  skippedEmails: number;
  success: boolean;
  warnings: string[];
}

export interface NotificationAutomationResult
  extends NotificationDispatchResult {
  automationType: NotificationAutomationType;
}

export interface AdminOverviewStats {
  activeVendors: number;
  availableStalls: number;
  maintenanceStalls: number;
  occupancyPct: number;
  occupiedStalls: number;
  totalCollected: number;
  totalOverdue: number;
  totalPayments: number;
  totalPending: number;
  totalStalls: number;
}

export interface StaffOverviewStats {
  activeStalls: number;
  maintenanceStalls: number;
  monthlyRevenue: number;
  todaysRevenue: number;
  todaysTxnCount: number;
  weeklyRevenue: number;
  yearlyRevenue: number;
}

export interface VendorOverviewStats {
  businessName: string | null;
  email: string | null;
  fullName: string | null;
  location: string | null;
  monthlyRent: number | null;
  nextDueDate: string | null;
  size: string | null;
  stallId: string | null;
  stallNumber: string | null;
  stallStatus: string | null;
  totalOverdue: number | null;
  totalPaid: number | null;
  totalPending: number | null;
  userId: string | null;
}

export interface PaymentReportRow {
  collected: number;
  occupancyPct: number;
  overdue: number;
  pending: number;
  periodLabel: string;
  periodMonth: number;
  periodYear: number;
  totalAmount: number;
  totalTransactions: number;
}
