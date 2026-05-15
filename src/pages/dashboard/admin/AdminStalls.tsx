import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Store, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { stallService } from "@/services/stallService";
import { vendorService } from "@/services/vendorService";
import type { StallRow, StallStatus, VendorOption } from "@/types/domain";

const statusColors: Record<string, string> = {
  available: "bg-primary/10 text-primary",
  occupied: "bg-secondary/10 text-secondary",
  maintenance: "bg-destructive/10 text-destructive",
};

interface StallFormState {
  location: string;
  monthly_rent: string;
  notes: string;
  size: string;
  stall_number: string;
  status: StallStatus;
  vendor_id: string;
}

const initialFormState: StallFormState = {
  location: "",
  monthly_rent: "0",
  notes: "",
  size: "standard",
  stall_number: "",
  status: "available",
  vendor_id: "",
};

function normalizeStallStatus(value: string): StallStatus | "all" {
  if (
    value === "available" ||
    value === "occupied" ||
    value === "maintenance" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

const AdminStalls = () => {
  const { toast } = useToast();
  const [stalls, setStalls] = useState<StallRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StallStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StallRow | null>(null);
  const [deleting, setDeleting] = useState<StallRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StallFormState>(initialFormState);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [stallsData, vendorsData] = await Promise.all([
        stallService.listRawStalls(),
        vendorService.listActiveVendors(),
      ]);

      setStalls(stallsData);
      setVendors(vendorsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh({
    channelName: "admin-stalls-stalls",
    onRefresh: fetchData,
    table: "stalls",
  });

  useRealtimeRefresh({
    channelName: "admin-stalls-vendors",
    onRefresh: fetchData,
    table: "profiles",
  });

  const resetForm = () => {
    setForm(initialFormState);
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (stall: StallRow) => {
    setEditing(stall);
    setForm({
      location: stall.location || "",
      monthly_rent: String(stall.monthly_rent ?? 0),
      notes: stall.notes || "",
      size: stall.size || "standard",
      stall_number: stall.stall_number,
      status:
        stall.status === "occupied" ||
        stall.status === "maintenance" ||
        stall.status === "available"
          ? stall.status
          : "available",
      vendor_id: stall.vendor_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.stall_number.trim()) {
      toast({
        title: "Error",
        description: "Stall number is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        location: form.location || null,
        monthly_rent: parseFloat(form.monthly_rent) || 0,
        notes: form.notes || null,
        size: form.size || null,
        stall_number: form.stall_number,
        status: form.status,
        vendor_id: form.vendor_id || null,
      };

      if (editing) {
        await stallService.updateStall(editing.id, payload);
      } else {
        await stallService.createStall(payload);
      }

      toast({ title: editing ? "Stall updated" : "Stall added" });
      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save stall",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      await stallService.deleteStall(deleting.id);
      toast({ title: "Stall deleted" });
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete stall",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleting(null);
    }
  };

  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((vendor) => [vendor.userId, vendor])),
    [vendors],
  );

  const filtered = useMemo(() => {
    return stalls.filter((stall) => {
      if (statusFilter !== "all" && stall.status !== statusFilter) {
        return false;
      }

      if (
        search &&
        !stall.stall_number.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [search, stalls, statusFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Stall Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all market stalls
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="gap-2 bg-gradient-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add Stall
          </Button>
        </div>

        <Card className="space-y-4 p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stall number..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(normalizeStallStatus(value))}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
                <TabsTrigger value="occupied">Occupied</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Store className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>No stalls found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stall #</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((stall) => (
                    <TableRow key={stall.id}>
                      <TableCell className="font-medium">
                        {stall.stall_number}
                      </TableCell>
                      <TableCell>{stall.location || "-"}</TableCell>
                      <TableCell>{stall.size || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[stall.status] || ""}
                        >
                          {stall.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        PHP {Number(stall.monthly_rent ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {stall.vendor_id && vendorMap[stall.vendor_id]
                          ? vendorMap[stall.vendor_id].fullName
                          : "-"}
                      </TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(stall)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleting(stall);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogTitle>{editing ? "Edit Stall" : "Add New Stall"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stall Number *</Label>
                <Input
                  value={form.stall_number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stall_number: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Rent (PHP)</Label>
                <Input
                  type="number"
                  value={form.monthly_rent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      monthly_rent: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Select
                  value={form.size}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, size: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: StallStatus) =>
                    setForm((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign Vendor</Label>
                <Select
                  value={form.vendor_id || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      vendor_id: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.userId} value={vendor.userId}>
                        {vendor.fullName}{" "}
                        {vendor.businessName ? `(${vendor.businessName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={2}
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
              {saving ? "Saving..." : editing ? "Update" : "Add Stall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stall</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete stall{" "}
            <strong>{deleting?.stall_number}</strong>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminStalls;
