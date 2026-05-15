import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { BarChart3, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { format, startOfDay, startOfMonth, startOfYear, isAfter } from "date-fns";

/* ================= TYPES ================= */

type Payment = {
  id: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  amount: number | string;
  receipt_number?: string | null;
  status: string;
};

type Stall = {
  id: string;
  status: "occupied" | "vacant" | string;
};

/* ================= COMPONENT ================= */

const StaffReports = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [paymentsRes, stallsRes] = await Promise.all([
        supabase.from("payments").select("*").eq("status", "paid"),
        supabase.from("stalls").select("*"),
      ]);

      setPayments((paymentsRes.data as Payment[]) || []);
      setStalls((stallsRes.data as Stall[]) || []);

      setLoading(false);
    };

    fetchData();
  }, []);

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const dailyPayments = payments.filter((p) =>
    isAfter(new Date(p.payment_date), todayStart)
  );

  const monthlyPayments = payments.filter((p) =>
    isAfter(new Date(p.payment_date), monthStart)
  );

  const yearlyPayments = payments.filter((p) =>
    isAfter(new Date(p.payment_date), yearStart)
  );

  const sum = (arr: Payment[]) =>
    arr.reduce((s, p) => s + Number(p.amount), 0);

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const monthPayments = yearlyPayments.filter(
      (p) => new Date(p.payment_date).getMonth() === i
    );

    return {
      month: months[i],
      count: monthPayments.length,
      total: sum(monthPayments),
    };
  }).filter((m) => m.count > 0 || m.month === months[now.getMonth()]);

  const occupancyRate =
    stalls.length > 0
      ? Math.round(
          (stalls.filter((s) => s.status === "occupied").length /
            stalls.length) *
            100
        )
      : 0;

  /* ================= TABLE ================= */

  const PaymentTable = ({ data }: { data: Payment[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Receipt #</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No records found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {format(new Date(p.payment_date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                {months[p.period_month - 1]} {p.period_year}
              </TableCell>
              <TableCell className="font-medium">
                ₱{Number(p.amount).toLocaleString()}
              </TableCell>
              <TableCell>{p.receipt_number || "—"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  /* ================= UI ================= */

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            View daily, monthly, and yearly revenue reports
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <Card className="p-4">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">
              ₱{sum(dailyPayments).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Today</p>
          </Card>

          <Card className="p-4">
            <Calendar className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">
              ₱{sum(monthlyPayments).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </Card>

          <Card className="p-4">
            <TrendingUp className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">
              ₱{sum(yearlyPayments).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">This Year</p>
          </Card>

          <Card className="p-4">
            <BarChart3 className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{occupancyRate}%</p>
            <p className="text-xs text-muted-foreground">Occupancy</p>
          </Card>

        </div>

        {/* TABS */}
        <Card className="p-6">
          <Tabs defaultValue="daily">

            <TabsList className="mb-4">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <PaymentTable data={dailyPayments} />
            </TabsContent>

            <TabsContent value="monthly">
              <PaymentTable data={monthlyPayments} />
            </TabsContent>

            <TabsContent value="yearly">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {monthlyBreakdown.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.month}</TableCell>
                      <TableCell>{m.count}</TableCell>
                      <TableCell>₱{m.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

          </Tabs>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default StaffReports;