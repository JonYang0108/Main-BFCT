import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Search, Users } from "lucide-react";
import { useLocation } from "react-router-dom";

import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { userService } from "@/services/userService";
import { vendorService } from "@/services/vendorService";
import type { VendorOption } from "@/types/domain";




const statusStyles: Record<string, string> = {
  active: "border-primary/20 bg-primary/10 text-primary",
  approved: "border-primary/20 bg-primary/10 text-primary",
  pending: "border-secondary/20 bg-secondary/10 text-secondary",
  suspended: "border-destructive/20 bg-destructive/10 text-destructive",
  inactive: "border-muted/20 bg-muted/10 text-muted-foreground",
};

function AccountStatusBadge({ status }: { status: string | null }) {
  const displayStatus = status ?? "pending";
  const label =
    displayStatus === "inactive"
      ? "Inactive"
      : displayStatus === "suspended"
        ? "Suspended"
        : displayStatus === "approved"
          ? "Approved"
          : displayStatus === "pending"
            ? "Pending"
            : "Active";

  return (
    <Badge
      variant="outline"
      className={statusStyles[displayStatus] || statusStyles.pending}
    >
      {label}
    </Badge>
  );
}

interface EditFormState {
  address: string;
  businessName: string;
  fullName: string;
  phone: string;
}

const initialFormState: EditFormState = {
  address: "",
  businessName: "",
  fullName: "",
  phone: "",
};

export default function AdminVendors() {
  const location = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorOption | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setVendors(await vendorService.listAdminVendors());
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
  }, [loadVendors, location.pathname]);


  useRealtimeRefresh({
    channelName: "admin-vendors-profiles",
    onRefresh: loadVendors,
    table: "profiles",
  });

  useRealtimeRefresh({
    channelName: "admin-vendors-stalls",
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

  const openEditDialog = (vendor: VendorOption) => {
    setEditingVendor(vendor);
    setForm({
      address: vendor.address ?? "",
      businessName: vendor.businessName ?? "",
      fullName: vendor.fullName,
      phone: vendor.phone ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingVendor) {
      return;
    }

    setSaving(true);

    try {
      await userService.updateProfile({
        address: form.address.trim() || null,
        business_name: form.businessName.trim() || null,
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        user_id: editingVendor.userId,
      });

      toast({ title: "Vendor profile updated" });
      setDialogOpen(false);
      await loadVendors();
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Failed to update vendor.",
        title: "Update failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Vendor Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage approved vendor accounts.
          </p>
        </div>

        {errorMessage ? (
          <Card className="p-4 text-sm text-destructive">{errorMessage}</Card>
        ) : null}

        <Card className="space-y-4 p-4 shadow-card">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search vendors..."
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>No vendors found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Assigned Stall</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.userId}>
                      <TableCell className="font-medium">
                        {vendor.fullName}
                      </TableCell>
                      <TableCell>{vendor.email}</TableCell>
                      <TableCell>{vendor.phone || "-"}</TableCell>
                      <TableCell>{vendor.businessName || "-"}</TableCell>
                      <TableCell>{vendor.stallNumber || "-"}</TableCell>
                      <TableCell>
                        <AccountStatusBadge status={vendor.accountStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(vendor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Full Name</Label>
                <Input
                  id="vendor-name"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input
                  id="vendor-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-business">Business Name</Label>
              <Input
                id="vendor-business"
                value={form.businessName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    businessName: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-address">Address</Label>
              <Input
                id="vendor-address"
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-primary text-primary-foreground"
            >
              {saving ? "Saving..." : "Update Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
