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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
        supabase.from("jobs").select("*").eq("completion_date", today).eq("status", "completed"),
        supabase.from("expenses").select("*").eq("expense_date", today),
      ]);
      
      const { data: allMaterials } = await supabase.from("materials").select("*");
      const materials = allMaterials?.filter(m => Number(m.quantity) < Number(m.threshold)) || [];

      const revenue = jobs.data?.reduce((sum, j) => sum + Number(j.cost), 0) || 0;
      const expenseTotal = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const profit = revenue - expenseTotal;

      const reportData = {
        date: today,
        revenue,
        expenses: expenseTotal,
        profit,
        jobs_completed: jobs.data?.length || 0,
        low_stock_items: materials.length,
      };

      // Save to database
      await supabase.from("reports").insert({
        report_type: "daily",
        report_date: today,
        report_data: reportData as any,
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 14, 20);
      doc.setFontSize(14);
      doc.text("Daily Summary Report", 14, 32);
      
      // Date
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Date: ${format(new Date(), "MMM dd, yyyy")}`, 14, 55);
      
      // Summary Stats
      doc.setFontSize(16);
      doc.text("Performance Summary", 14, 70);
      
      autoTable(doc, {
        startY: 75,
        head: [["Metric", "Value"]],
        body: [
          ["Jobs Completed", reportData.jobs_completed.toString()],
          ["Revenue", `$${revenue.toFixed(2)}`],
          ["Expenses", `$${expenseTotal.toFixed(2)}`],
          ["Net Profit", `$${profit.toFixed(2)}`],
          ["Low Stock Items", reportData.low_stock_items.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      // Jobs Details
      if (jobs.data && jobs.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Completed Jobs", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Client", "Job Type", "Cost"]],
          body: jobs.data.map(j => [j.client_name, j.job_type, `$${Number(j.cost).toFixed(2)}`]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
        });
      }

      // Expenses Details
      if (expenses.data && expenses.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Expenses", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Category", "Description", "Amount"]],
          body: expenses.data.map(e => [e.category, e.description || "-", `$${Number(e.amount).toFixed(2)}`]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
        });
      }

      // Low Stock Materials
      if (materials.length > 0) {
        doc.setFontSize(16);
        doc.text("Low Stock Alert", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Material", "Current Stock", "Threshold"]],
          body: materials.map(m => [m.name, `${m.quantity} ${m.unit}`, `${m.threshold} ${m.unit}`]),
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68] },
        });
      }

      doc.save(`NetGenix-Daily-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "Daily Report Generated",
        description: `PDF downloaded for ${format(new Date(), "MMM dd, yyyy")}`,
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

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 14, 20);
      doc.setFontSize(14);
      doc.text("VAT Report", 14, 32);
      
      // Period
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.period}`, 14, 55);
      
      // VAT Summary
      doc.setFontSize(16);
      doc.text("VAT Summary", 14, 70);
      
      autoTable(doc, {
        startY: 75,
        head: [["Description", "Amount"]],
        body: [
          ["Total Sales (Excl. VAT)", `$${totalSales.toFixed(2)}`],
          ["VAT Rate", `${(vatRate * 100).toFixed(0)}%`],
          ["VAT Amount", `$${vatAmount.toFixed(2)}`],
          ["Total Due (Incl. VAT)", `$${totalDue.toFixed(2)}`],
          ["Number of Jobs", reportData.jobs_count.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      // Jobs Breakdown
      if (jobs && jobs.length > 0) {
        doc.setFontSize(16);
        doc.text("Jobs Breakdown", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Client", "Job Type", "Amount"]],
          body: jobs.map(j => [
            j.completion_date || "-",
            j.client_name,
            j.job_type,
            `$${Number(j.cost).toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Total:", `$${totalSales.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
        });
      }

      doc.save(`NetGenix-VAT-Report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`);

      toast({
        title: "VAT Report Generated",
        description: `PDF downloaded for period ${reportData.period}`,
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
