import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Download, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const Reports = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateDailyReport = async () => {
    setGenerating(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const [jobs, expenses] = await Promise.all([
        supabase.from("jobs").select("*").eq("completion_date", today),
        supabase.from("expenses").select("*").eq("expense_date", today),
      ]);
      
      const { data: allMaterials } = await supabase.from("materials").select("*");
      const materials = { data: allMaterials?.filter(m => m.quantity < m.threshold) || [] };

      const revenue = jobs.data?.reduce((sum, j) => sum + Number(j.cost), 0) || 0;
      const expenseTotal = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const profit = revenue - expenseTotal;

      const reportData = {
        date: today,
        revenue,
        expenses: expenseTotal,
        profit,
        jobs_completed: jobs.data?.length || 0,
        low_stock_items: materials.data?.length || 0,
      };

      // Save to database
      await supabase.from("reports").insert({
        report_type: "daily",
        report_date: today,
        report_data: reportData as any,
      });

      toast({
        title: "Daily Report Generated",
        description: `Report for ${format(new Date(), "MMM dd, yyyy")} has been created.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateMonthlyVATReport = async () => {
    setGenerating(true);
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .gte("completion_date", startDate)
        .lte("completion_date", endDate)
        .eq("status", "completed");

      const totalSales = jobs?.reduce((sum, j) => sum + Number(j.cost), 0) || 0;
      const vatRate = 0.15; // 15% VAT
      const vatAmount = totalSales * vatRate;
      const totalDue = totalSales + vatAmount;

      const reportData = {
        period: `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        total_sales: totalSales,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_due: totalDue,
        jobs_count: jobs?.length || 0,
      };

      await supabase.from("reports").insert({
        report_type: "vat",
        report_date: endDate,
        report_data: reportData as any,
      });

      toast({
        title: "VAT Report Generated",
        description: `Total Sales: $${totalSales.toFixed(2)} | VAT: $${vatAmount.toFixed(2)}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Daily Summary Report</CardTitle>
                <CardDescription>Generate today's performance report</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateDailyReport} 
              disabled={generating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Daily Report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle>VAT Report</CardTitle>
                <CardDescription>Generate monthly VAT calculations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => range && setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button 
              onClick={generateMonthlyVATReport} 
              disabled={generating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate VAT Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
