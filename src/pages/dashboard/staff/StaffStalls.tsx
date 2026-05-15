import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { Store, Search } from "lucide-react";

const statusColor: Record<string, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  occupied: "bg-blue-100 text-blue-800 border-blue-200",
  maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

// ✅ Type definition
type Stall = {
  id: string;
  stall_number: string;
  location: string | null;
  size: string | null;
  monthly_rent: number;
  status: "available" | "occupied" | "maintenance";
};

const StaffStalls = () => {
  // ✅ Fixed typing
  const [stalls, setStalls] = useState<Stall[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Supabase fetch
  useEffect(() => {
    const fetchStalls = async () => {
      try {
        const { data, error } = await supabase
          .from("stalls")
          .select("*");

        if (error) {
          console.error("Supabase Error:", error);
          return;
        }

        setStalls(data as Stall[]);
      } catch (error) {
        console.error("Unexpected Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStalls();
  }, []);

  // ✅ Search filtering
  const filtered = stalls.filter(
    (s) =>
      s.stall_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.location || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // ✅ Statistics
  const stats = {
    total: stalls.length,
    occupied: stalls.filter((s) => s.status === "occupied").length,
    available: stalls.filter((s) => s.status === "available").length,
    maintenance: stalls.filter((s) => s.status === "maintenance").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Stall Management
          </h1>

          <p className="text-muted-foreground text-sm">
            Monitor all stalls and their statuses
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Stalls",
              value: stats.total,
              color: "text-primary",
            },
            {
              label: "Occupied",
              value: stats.occupied,
              color: "text-blue-600",
            },
            {
              label: "Available",
              value: stats.available,
              color: "text-green-600",
            },
            {
              label: "Maintenance",
              value: stats.maintenance,
              color: "text-yellow-600",
            },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className={`text-2xl font-bold font-display ${s.color}`}>
                {s.value}
              </p>

              <p className="text-xs text-muted-foreground">
                {s.label}
              </p>
            </Card>
          ))}
        </div>

        {/* Table Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              All Stalls
            </h2>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Search stalls..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading...
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stall #</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No stalls found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.stall_number}
                      </TableCell>

                      <TableCell>
                        {s.location || "—"}
                      </TableCell>

                      <TableCell className="capitalize">
                        {s.size || "—"}
                      </TableCell>

                      <TableCell>
                        ₱
                        {Number(
                          s.monthly_rent
                        ).toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`capitalize ${
                            statusColor[s.status] || ""
                          }`}
                        >
                          {s.status}
                        </Badge>
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
};

export default StaffStalls;