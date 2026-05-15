import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminStalls from "./pages/dashboard/admin/AdminStalls";
import AdminVendors from "./pages/dashboard/admin/AdminVendors";
import AdminPayments from "./pages/dashboard/admin/AdminPayments";
import AdminAnnouncements from "./pages/dashboard/admin/AdminAnnouncements";
import AdminReports from "./pages/dashboard/admin/AdminReports";
import AdminUserManagement from "./pages/dashboard/admin/AdminUserManagement";
import AdminAccountRequests from "./pages/dashboard/admin/AdminAccountRequests";
import StaffDashboard from "./pages/dashboard/StaffDashboard";
import StaffStalls from "./pages/dashboard/staff/StaffStalls";
import StaffVendors from "./pages/dashboard/staff/StaffVendors";
import StaffAnnouncements from "./pages/dashboard/staff/StaffAnnouncements";
import StaffPayments from "./pages/dashboard/staff/StaffPayments";
import StaffReports from "./pages/dashboard/staff/StaffReports";
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import VendorStall from "./pages/dashboard/vendor/VendorStall";
import VendorPayments from "./pages/dashboard/vendor/VendorPayments";
import VendorAnnouncements from "./pages/dashboard/vendor/VendorAnnouncements";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const App = () => (
  <AppErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard/admin" element={<AdminRoute />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="stalls" element={<AdminStalls />} />
                  <Route path="vendors" element={<AdminVendors />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route
                    path="announcements"
                    element={<AdminAnnouncements />}
                  />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="users" element={<AdminUserManagement />} />
                  <Route
                    path="account-requests"
                    element={<AdminAccountRequests />}
                  />
                </Route>
                <Route
                  path="/dashboard/staff"
                  element={
                    <ProtectedRoute allowedRoles={["staff"]}>
                      <StaffDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/staff/stalls"
                  element={
                    <ProtectedRoute allowedRoles={["staff"]}>
                      <StaffStalls />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/staff/vendors"
                  element={
                    <ProtectedRoute allowedRoles={["staff"]}>
                      <StaffVendors />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/staff/announcements"
                  element={
                    <ProtectedRoute allowedRoles={["staff"]}>
                      <StaffAnnouncements />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/staff/payments"
                  element={
                    <ProtectedRoute allowedRoles={["staff"]}>
                      <StaffPayments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/staff/reports"
                  element={
                    <ProtectedRoute allowedRoles={["staff"]}>
                      <StaffReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/vendor"
                  element={
                    <ProtectedRoute allowedRoles={["vendor"]}>
                      <VendorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/vendor/stall"
                  element={
                    <ProtectedRoute allowedRoles={["vendor"]}>
                      <VendorStall />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/vendor/payments"
                  element={
                    <ProtectedRoute allowedRoles={["vendor"]}>
                      <VendorPayments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/vendor/announcements"
                  element={
                    <ProtectedRoute allowedRoles={["vendor"]}>
                      <VendorAnnouncements />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </AppErrorBoundary>
);

export default App;
