import type { QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  accountRequests: ["account-requests"] as const,
  adminOverview: ["admin-overview"] as const,
  announcements: (limit?: number) =>
    ["announcements", limit ?? "all"] as const,
  auth: ["auth"] as const,
  notifications: (userId?: string) =>
    ["notifications", userId ?? "current-user"] as const,
  payments: (scope: "admin" | "staff" | "vendor", userId?: string) =>
    ["payments", scope, userId ?? "all"] as const,
  profile: (userId?: string) => ["profile", userId ?? "current-user"] as const,
  reports: (scope: "admin" | "staff" | "vendor", userId?: string) =>
    ["reports", scope, userId ?? "all"] as const,
  stalls: (scope: "admin" | "staff" | "vendor", userId?: string) =>
    ["stalls", scope, userId ?? "all"] as const,
  userValidIds: (userId?: string) =>
    ["user-valid-ids", userId ?? "current-user"] as const,
  vendors: (scope: "active" | "admin") => ["vendors", scope] as const,
} as const;

export function getRealtimeQueryKeys(table: string): QueryKey[] {
  switch (table) {
    case "announcements":
      return [queryKeys.announcements()];
    case "notifications":
      return [queryKeys.notifications()];
    case "payments":
      return [
        queryKeys.adminOverview,
        queryKeys.payments("admin"),
        queryKeys.payments("staff"),
        queryKeys.payments("vendor"),
        queryKeys.reports("admin"),
        queryKeys.reports("staff"),
        queryKeys.reports("vendor"),
      ];
    case "profiles":
    case "user_roles":
      return [
        queryKeys.accountRequests,
        queryKeys.auth,
        queryKeys.profile(),
        queryKeys.vendors("active"),
        queryKeys.vendors("admin"),
      ];
    case "stalls":
      return [
        queryKeys.adminOverview,
        queryKeys.stalls("admin"),
        queryKeys.stalls("staff"),
        queryKeys.stalls("vendor"),
        queryKeys.vendors("active"),
        queryKeys.vendors("admin"),
      ];
    case "user_valid_ids":
      return [queryKeys.accountRequests, queryKeys.userValidIds()];
    case "vendor_requests":
      return [queryKeys.accountRequests];
    default:
      return [];
  }
}
