import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Search, Trash2, UserPlus, Users } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { adminService } from "@/services/adminService";
import { vendorService } from "@/services/vendorService";
import type { VendorOption } from "@/types/domain";

const statusStyles: Record<string, string> = {
  active: "border-primary/20 bg-primary/10 text-primary",
  pending: "border-secondary/20 bg-secondary/10 text-secondary",
  suspended: "border-destructive/20 bg-destructive/10 text-destructive",
  declined: "border-destructive/20 bg-destructive/10 text-destructive",
};

function AccountStatusBadge({ status }: { status: string | null }) {
  const displayStatus = status ?? "pending";
  const label =
    displayStatus === "suspended"
      ? "Suspended"
      : displayStatus === "declined"
        ? "Declined"
        : displayStatus === "pending"
          ? "Pending"
          : "Active";

  return (
    <Badge
      variant="outline"
      className={statusStyles[displayStatus] || "border-muted/20 bg-muted/10"}
    >
      {label}
    </Badge>
  );
}

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingVendor, setViewingVendor] = useState<VendorOption | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingVendor, setDeletingVendor] = useState<VendorOption | null>(
    null,
  );
  const [addForm, setAddForm] = useState({
    address: "",
    businessName: "",
    email: "",
    fullName: "",
    password: "",
    phone: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      setVendors(await vendorService.listAdminVendors());
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch vendors.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh({
    channelName: "admin-user-management-profiles",
    onRefresh: fetchData,
    table: "profiles",
  });

  useRealtimeRefresh({
    channelName: "admin-user-management-roles",
    onRefresh: fetchData,
    table: "user_roles",
  });

  const handleAddVendor = async () => {
    if (adding) return;

    if (!addForm.fullName.trim() || !addForm.email.trim()) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    if (!addForm.password || addForm.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);

    try {
      await adminService.createVendor({
        address: addForm.address.trim() || undefined,
        businessName: addForm.businessName.trim() || undefined,
        email: addForm.email.trim(),
        fullName: addForm.fullName.trim(),
        password: addForm.password,
        phone: addForm.phone.trim() || undefined,
      });

      toast({
        title: "Vendor added successfully",
        description: "The vendor account has been created.",
      });

      setAddDialogOpen(false);
      setAddForm({
        address: "",
        businessName: "",
        email: "",
        fullName: "",
        password: "",
        phone: "",
      });
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add vendor.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!deletingVendor) {
      return;
    }

    setDeleting(true);

    try {
      await adminService.deleteVendor(deletingVendor.userId);
      toast({
        title: "Vendor deleted",
        description: `${deletingVendor.fullName} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setDeletingVendor(null);
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete vendor.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredVendors = useMemo(() => {
    if (!search.trim()) {
      return vendors;
    }

    const query = search.toLowerCase();

    return vendors.filter((vendor) => {
      return (
        vendor.fullName.toLowerCase().includes(query) ||
        (vendor.businessName || "").toLowerCase().includes(query) ||
        vendor.email.toLowerCase().includes(query)
      );
    });
  }, [search, vendors]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage vendor accounts
            </p>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            className="gap-2 bg-gradient-primary text-primary-foreground"
          >
            <UserPlus className="h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        <Card className="space-y-4 p-4 shadow-card">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
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
              <p>No vendors found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Joined</TableHead>
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
                      <TableCell>
                        {vendor.createdAt
                          ? new Date(vendor.createdAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <AccountStatusBadge status={vendor.accountStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setViewingVendor(vendor);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setDeletingVendor(vendor);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>Create a new vendor account.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={addForm.fullName}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="vendor@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={addForm.password}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={addForm.phone}
                  onChange={(event) =>
                    setAddForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={addForm.businessName}
                  onChange={(event) =>
                    setAddForm((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={addForm.address}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleAddVendor}
              disabled={adding}
              className="bg-gradient-primary text-primary-foreground"
            >
              {adding ? "Creating..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>View the selected vendor’s details.</DialogDescription>
          </DialogHeader>

          {viewingVendor ? (
            <div className="grid gap-3 py-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{viewingVendor.fullName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{viewingVendor.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <span className="font-medium">{viewingVendor.phone || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Business:</span>{" "}
                <span className="font-medium">
                  {viewingVendor.businessName || "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Address:</span>{" "}
                <span className="font-medium">{viewingVendor.address || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assigned Stall:</span>{" "}
                <span className="font-medium">
                  {viewingVendor.stallNumber || "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <AccountStatusBadge status={viewingVendor.accountStatus} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              This will permanently remove {deletingVendor?.fullName}
              &apos;s vendor account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVendor}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminUserManagement;
