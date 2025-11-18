import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type TimePeriod = "7days" | "1month";

export const PerformanceCharts = () => {
  const [period, setPeriod] = useState<TimePeriod>("7days");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const days = period === "7days" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = new Date().toISOString().split("T")[0];

      // Fetch all data in one query for the date range
      const [jobs, expenses] = await Promise.all([
        supabase.from("jobs").select("*").gte("completion_date", startDateStr).lte("completion_date", endDateStr).eq("status", "completed"),
        supabase.from("expenses").select("*").gte("expense_date", startDateStr).lte("expense_date", endDateStr),
      ]);

      // Group data by date
      const dateMap = new Map();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dateMap.set(dateStr, {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
          expense: 0,
          profit: 0,
        });
      }

      // Aggregate jobs by date
      jobs.data?.forEach(job => {
        const entry = dateMap.get(job.completion_date);
        if (entry) entry.revenue += Number(job.cost);
      });

      // Aggregate expenses by date
      expenses.data?.forEach(expense => {
        const entry = dateMap.get(expense.expense_date);
        if (entry) entry.expense += Number(expense.amount);
      });

      // Calculate profit
      const data = Array.from(dateMap.values()).map(entry => ({
        ...entry,
        profit: entry.revenue - entry.expense,
      }));

      setChartData(data);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <TabsList>
            <TabsTrigger value="7days">7 Days</TabsTrigger>
            <TabsTrigger value="1month">1 Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
            <p className="text-sm text-muted-foreground">Track income and spending trends</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="hsl(var(--destructive))"
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                  strokeWidth={2}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Daily Profit</CardTitle>
            <p className="text-sm text-muted-foreground">Net profit by day</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="profit"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                  name="Profit"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
