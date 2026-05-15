import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Mail, Search, Users } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { vendorService } from "@/services/vendorService";
import type { VendorOption } from "@/types/domain";

export default function StaffVendors() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setVendors(await vendorService.listActiveVendors());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load vendors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  useRealtimeRefresh({
    channelName: "staff-vendors-profiles",
    onRefresh: loadVendors,
    table: "profiles",
  });

  useRealtimeRefresh({
    channelName: "staff-vendors-stalls",
    onRefresh: loadVendors,
    table: "stalls",
  });

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return vendors;
    }

    return vendors.filter((vendor) => {
      return (
        vendor.fullName.toLowerCase().includes(query) ||
        vendor.email.toLowerCase().includes(query) ||
        (vendor.businessName ?? "").toLowerCase().includes(query)
      );
    });
  }, [search, vendors]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Vendor Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            View approved vendor accounts and their stall assignments.
          </p>
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-4">
                <Skeleton className="h-16 w-full" />
              </Card>
            ))
          ) : (
            <>
              <Card className="p-4">
                <Users className="mb-2 h-5 w-5 text-primary" />
                <p className="font-display text-2xl font-bold text-foreground">
                  {vendors.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Approved Vendors
                </p>
              </Card>
              <Card className="p-4">
                <Building2 className="mb-2 h-5 w-5 text-primary" />
                <p className="font-display text-2xl font-bold text-foreground">
                  {vendors.filter((vendor) => vendor.stallNumber).length}
                </p>
                <p className="text-xs text-muted-foreground">With Stalls</p>
              </Card>
              <Card className="p-4">
                <Users className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="font-display text-2xl font-bold text-foreground">
                  {vendors.filter((vendor) => !vendor.stallNumber).length}
                </p>
                <p className="text-xs text-muted-foreground">Without Stalls</p>
              </Card>
            </>
          )}
        </div>

        <Card className="p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 font-display font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              All Vendors
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search vendors..."
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Stall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.userId}>
                      <TableCell className="font-medium">
                        {vendor.fullName}
                      </TableCell>
                      <TableCell>{vendor.businessName || "-"}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {vendor.email}
                      </TableCell>
                      <TableCell>
                        {vendor.stallNumber
                          ? `Stall ${vendor.stallNumber}`
                          : "Unassigned"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
