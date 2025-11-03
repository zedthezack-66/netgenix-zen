import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Package,
  AlertTriangle,
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid 
} from "recharts";

interface DashboardStats {
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  totalExpenses: number;
  lowStockItems: number;
  profit: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs
      const { data: jobs } = await supabase.from("jobs").select("*");
      const completedJobs = jobs?.filter((j) => j.status === "completed") || [];
      const totalRevenue = completedJobs.reduce((sum, j) => sum + Number(j.cost), 0);

      // Fetch expenses
      const { data: expenses } = await supabase.from("expenses").select("*");
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Fetch materials
      const { data: materials } = await supabase.from("materials").select("*");
      const lowStockItems =
        materials?.filter((m) => Number(m.quantity) < Number(m.threshold)).length || 0;

      // Calculate profit
      const profit = totalRevenue - totalExpenses;

      setStats({
        totalJobs: jobs?.length || 0,
        completedJobs: completedJobs.length,
        totalRevenue,
        totalExpenses,
        lowStockItems,
        profit,
      });

      // Generate chart data (last 7 days)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayJobs = completedJobs.filter(
          (j) => j.completion_date === dateStr
        );
        const dayExpenses = expenses?.filter(
          (e) => e.expense_date === dateStr
        ) || [];

        const revenue = dayJobs.reduce((sum, j) => sum + Number(j.cost), 0);
        const expense = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        chartData.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue,
          expense,
          profit: revenue - expense,
        });
      }

      setChartData(chartData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    trend?: "up" | "down";
  }) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
          {description}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs}
          description={`${stats.completedJobs} completed`}
          icon={Briefcase}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          description="From completed jobs"
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Expenses"
          value={`$${stats.totalExpenses.toFixed(2)}`}
          description="Total expenses"
          icon={TrendingDown}
          trend="down"
        />
        <StatCard
          title="Profit"
          value={`$${stats.profit.toFixed(2)}`}
          description="Net profit"
          icon={stats.profit >= 0 ? TrendingUp : TrendingDown}
          trend={stats.profit >= 0 ? "up" : "down"}
        />
      </div>

      {stats.lowStockItems > 0 && (
        <Card className="border-warning bg-warning/10 backdrop-blur-sm animate-pulse">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center mr-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <CardTitle className="text-warning font-bold">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {stats.lowStockItems} material{stats.lowStockItems > 1 ? "s" : ""} running
              low on stock. Restock soon to avoid disruptions.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">7-Day Performance Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Track your revenue and expenses over the last week</p>
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
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorExpense)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
