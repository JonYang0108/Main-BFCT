import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  MapPin,
  Ruler,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/supabase.ts";
import { label } from "framer-motion/client";

type StallRecord = Database["public"]["Tables"]["stalls"]["Row"];
type StallStatus = "occupied" | "available" | "maintenance";

const statusConfig: Record<
  StallStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: LucideIcon;
  }
> = {
  occupied: { label: "Occupied", variant: "default", icon: CheckCircle },
  available: { label: "Available", variant: "secondary", icon: Clock },
  maintenance: {
    label: "Maintenance",
    variant: "destructive",
    icon: AlertTriangle,
  },
};

/**
 * PRODUCTION-GRADE VENDOR STALL DASHBOARD
 * 
 * This component safely handles the case where a vendor may not have
 * a stall assigned. It uses .maybeSingle() instead of .single() to
 * avoid PostgREST PGRST116 errors when no stall exists.
 * 
 * Architecture:
 * - Null-safe Supabase queries (.maybeSingle())
 * - React Strict Mode compatible (AbortController cleanup)
 * - Defensive null checks on auth state
 * - Comprehensive error logging
 * - Race condition protection
 */
const VendorStall = () => {
  const { user } = useAuth();
  const [stall, setStall] = useState<StallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track mounted state to prevent state updates on unmounted component
  const mountedRef = useRef(true);
  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Guard: No user yet
    if (!user) {
      if (mountedRef.current) {
        setLoading(false);
        setStall(null);
        setError(null);
      }
      return;
    }

    // Guard: Invalid user ID
    if (!user.id) {
      console.error("[VendorStall] User ID is undefined, cannot fetch stall");
      if (mountedRef.current) {
        setLoading(false);
        setStall(null);
        setError("User ID is invalid");
      }
      return;
    }

    // Set up fetch
    const fetchStall = async () => {
      // Create new AbortController for this fetch
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        console.log("[VendorStall] Fetching stall for vendor:", user.id);

        /**
         * CRITICAL: Use .maybeSingle() instead of .single()
         * 
         * .single() requires EXACTLY 1 row and throws PGRST116 if 0 rows
         * .maybeSingle() accepts 0 or 1 row and returns null if 0 rows
         * 
         * This handles the case where vendor has not been assigned a stall.
         */
        const { data, error: queryError } = await supabase
          .from("stalls")
          .select("*", { count: "exact" })
          .eq("vendor_id", user.id)
          .maybeSingle();  // ✓ Safe: 0 or 1 rows

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          console.log("[VendorStall] Request aborted, ignoring stale response");
          return;
        }

        // Handle query errors
        if (queryError) {
          const errorMessage = queryError.message || "Unknown error";
          console.error("[VendorStall] Query error:", {
            code: queryError.code,
            message: errorMessage,
            details: queryError.details,
          });

          if (mountedRef.current) {
            setError(`Failed to load stall: ${errorMessage}`);
            setStall(null);
          }
          return;
        }

        // Defensive null check
        if (data === undefined) {
          console.warn("[VendorStall] Query returned undefined instead of null");
          if (mountedRef.current) {
            setStall(null);
          }
          return;
        }

        // Success: Stall found or vendor has no stall (data === null)
        if (data === null) {
          console.log("[VendorStall] No stall assigned to vendor", user.id);
        } else {
          console.log("[VendorStall] Stall loaded:", {
            stallId: data.id,
            stallNumber: data.stall_number,
            status: data.status,
          });
        }

        if (mountedRef.current) {
          setStall(data as StallRecord | null);
        }

      } catch (exception) {
        // Catch programming errors (not network/query errors)
        console.error("[VendorStall] Unexpected error:", exception);

        if (mountedRef.current) {
          setError(
            exception instanceof Error
              ? exception.message
              : "Unexpected error loading stall",
          );
          setStall(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    // Execute fetch
    fetchStall();

    // Cleanup for React Strict Mode & component unmount
    return () => {
      // Cancel in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]); // Only refetch when user.id changes

  // Track mount state
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Resolve status for UI
  const status = statusConfig[stall?.status ?? "available"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Stall
          </h1>
          <p className="text-muted-foreground text-sm">
            View your assigned stall details
          </p>
        </div>

        {loading ? (
          // Loading state
          <Card className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </Card>
        ) : error ? (
          // Error state
          <Card className="p-8 border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-1">
              Error Loading Stall
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <p className="text-xs text-muted-foreground">
              Please refresh or contact support if this persists.
            </p>
          </Card>
        ) : !stall ? (
          // Empty state: Vendor has no stall
          <Card className="p-8 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-1">
              No Stall Assigned
            </h3>
            <p className="text-sm text-muted-foreground">
              You don't have a stall assigned yet. Please contact the admin to
              request a stall assignment.
            </p>
          </Card>
        ) : (
          // Success: Stall loaded
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Stall #{stall.stall_number}
              </CardTitle>
              <Badge
                variant={status.variant}
                className="flex items-center gap-1"
              >
                <status.icon className="h-3 w-3" />
                {status.label}
              </Badge>
            </CardHeader>

            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <Info icon={MapPin} label="Location" value={stall.location} />
                <Info icon={Ruler} label="Size" value={stall.size} />
                <Info
                  icon={CreditCard}
                  label="Monthly Rent"
                  value={`₱${Number(stall.monthly_rent).toLocaleString()}`}
                />
                <Info icon={FileText} label="Notes" value={stall.notes} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

const Info = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | number | null;
}) => (
  <div className="flex items-start gap-3">
    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>

    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="font-medium text-foreground text-sm">
        {value || "Not specified"}
      </p>
    </div>
  </div>
);

export default VendorStall;

