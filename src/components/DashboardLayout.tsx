import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NotificationPanel from "@/components/NotificationPanel";
import SignOutDialog from "@/components/SignOutDialog";
import ThemeToggle from "@/components/ThemeToggle";
import logo from "@/assets/bfct-logo.jfif";
import {
  LayoutDashboard,
  LogOut,
  Bell,
  Store,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  UserCog,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const navItems: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
  }[]
> = {
  admin: [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard/admin" },
    { label: "Stalls", icon: Store, path: "/dashboard/admin/stalls" },
    { label: "Vendors", icon: Users, path: "/dashboard/admin/vendors" },
    { label: "Payments", icon: CreditCard, path: "/dashboard/admin/payments" },
    { label: "Reports", icon: FileText, path: "/dashboard/admin/reports" },
    { label: "User Management", icon: UserCog, path: "/dashboard/admin/users" },
    {
      label: "Account Requests",
      icon: UserCheck,
      path: "/dashboard/admin/account-requests",
    },
    {
      label: "Announcements",
      icon: Bell,
      path: "/dashboard/admin/announcements",
    },
  ],
  staff: [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard/staff" },
    { label: "Stalls", icon: Store, path: "/dashboard/staff/stalls" },
    { label: "Vendors", icon: Users, path: "/dashboard/staff/vendors" },
    { label: "Payments", icon: CreditCard, path: "/dashboard/staff/payments" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/staff/reports" },
    {
      label: "Announcements",
      icon: Bell,
      path: "/dashboard/staff/announcements",
    },
  ],
  vendor: [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard/vendor" },
    { label: "My Stall", icon: Store, path: "/dashboard/vendor/stall" },
    { label: "Payments", icon: CreditCard, path: "/dashboard/vendor/payments" },
    {
      label: "Announcements",
      icon: Bell,
      path: "/dashboard/vendor/announcements",
    },
  ],
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = navItems[role || "vendor"] || [];
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-muted/30 dark:bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="BFCT"
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div>
              <span className="font-display font-bold text-sm text-foreground block">
                BFCT Bagsakan
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {role} Dashboard
              </span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setSignOutOpen(true)}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="BFCT"
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="font-display font-bold text-sm">
              BFCT Bagsakan
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationPanel />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex h-12 border-b border-border bg-card items-center justify-end px-6 gap-2">
          <ThemeToggle />
          <NotificationPanel />
        </header>

        {/* Mobile slide-out menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border shadow-elevated lg:hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <img
                      src={logo}
                      alt="BFCT"
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                    <span className="font-display font-bold text-sm text-foreground">
                      BFCT Bagsakan
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                  {items.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-3 border-t border-border">
                  <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {profile?.full_name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSignOutOpen(true);
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      <SignOutDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={handleSignOut}
      />
    </div>
  );
};

export default DashboardLayout;
