import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Download, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Reports = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [generating, setGenerating] = useState(false);

  const generateWeeklyReport = async () => {
    setGenerating(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      
      const [jobs, expenses] = await Promise.all([
        supabase.from("jobs").select("*").gte("completion_date", startDateStr).lte("completion_date", endDateStr).eq("status", "completed"),
        supabase.from("expenses").select("*").gte("expense_date", startDateStr).lte("expense_date", endDateStr),
      ]);
      
      const { data: allMaterials } = await supabase.from("materials").select("*");
      const materials = allMaterials?.filter(m => Number(m.quantity) < Number(m.threshold)) || [];

      const revenue = jobs.data?.reduce((sum, j) => sum + Number(j.cost), 0) || 0;
      const expenseTotal = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const profit = revenue - expenseTotal;

      const reportData = {
        period: `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`,
        revenue,
        expenses: expenseTotal,
        profit,
        jobs_completed: jobs.data?.length || 0,
        low_stock_items: materials.length,
      };

      await supabase.from("reports").insert({
        report_type: "weekly",
        report_date: endDateStr,
        report_data: reportData as any,
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 14, 20);
      doc.setFontSize(14);
      doc.text("Weekly Summary Report", 14, 32);
      
      // Add watermark
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text("System Powered by ZEDZACK TECH", pageWidth - 14, 37, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.period}`, 14, 55);
      
      doc.setFontSize(16);
      doc.text("Performance Summary", 14, 70);
      
      autoTable(doc, {
        startY: 75,
        head: [["Metric", "Value"]],
        body: [
          ["Jobs Completed", reportData.jobs_completed.toString()],
          ["Revenue", `ZMW ${revenue.toFixed(2)}`],
          ["Expenses", `ZMW ${expenseTotal.toFixed(2)}`],
          ["Net Profit", `ZMW ${profit.toFixed(2)}`],
          ["Low Stock Items", reportData.low_stock_items.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      if (jobs.data && jobs.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Completed Jobs", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Client", "Job Type", "Cost"]],
          body: jobs.data.map(j => [j.client_name, j.job_type, `ZMW ${Number(j.cost).toFixed(2)}`]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
        });
      }

      if (expenses.data && expenses.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Expenses", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Category", "Description", "Amount"]],
          body: expenses.data.map(e => [e.category, e.description || "-", `ZMW ${Number(e.amount).toFixed(2)}`]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
        });
      }

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

      doc.save(`NetGenix-Weekly-Report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.pdf`);

      toast.success("📊 Weekly Report Generated!", {
        description: `PDF downloaded for ${reportData.period}`,
      });
    } catch (error: any) {
      toast.error("Failed to generate report", {
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateMonthlyReport = async () => {
    setGenerating(true);
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const [jobs, expenses] = await Promise.all([
        supabase.from("jobs").select("*").gte("completion_date", startDate).lte("completion_date", endDate).eq("status", "completed"),
        supabase.from("expenses").select("*").gte("expense_date", startDate).lte("expense_date", endDate),
      ]);

      const { data: allMaterials } = await supabase.from("materials").select("*");
      const materials = allMaterials?.filter(m => Number(m.quantity) < Number(m.threshold)) || [];

      const revenue = jobs.data?.reduce((sum, j) => sum + Number(j.cost), 0) || 0;
      const expenseTotal = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const profit = revenue - expenseTotal;

      const reportData = {
        period: `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        revenue,
        expenses: expenseTotal,
        profit,
        jobs_completed: jobs.data?.length || 0,
        low_stock_items: materials.length,
      };

      await supabase.from("reports").insert({
        report_type: "monthly",
        report_date: endDate,
        report_data: reportData as any,
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 14, 20);
      doc.setFontSize(14);
      doc.text("Monthly Summary Report", 14, 32);
      
      // Add watermark
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text("System Powered by ZEDZACK TECH", pageWidth - 14, 37, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.period}`, 14, 55);
      
      doc.setFontSize(16);
      doc.text("Performance Summary", 14, 70);
      
      autoTable(doc, {
        startY: 75,
        head: [["Metric", "Value"]],
        body: [
          ["Jobs Completed", reportData.jobs_completed.toString()],
          ["Revenue", `ZMW ${revenue.toFixed(2)}`],
          ["Expenses", `ZMW ${expenseTotal.toFixed(2)}`],
          ["Net Profit", `ZMW ${profit.toFixed(2)}`],
          ["Low Stock Items", reportData.low_stock_items.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      if (jobs.data && jobs.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Completed Jobs", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Client", "Job Type", "Cost"]],
          body: jobs.data.map(j => [j.client_name, j.job_type, `ZMW ${Number(j.cost).toFixed(2)}`]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
        });
      }

      if (expenses.data && expenses.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Expenses", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Category", "Description", "Amount"]],
          body: expenses.data.map(e => [e.category, e.description || "-", `ZMW ${Number(e.amount).toFixed(2)}`]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
        });
      }

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

      doc.save(`NetGenix-Monthly-Report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`);

      toast.success("📊 Monthly Report Generated!", {
        description: `PDF downloaded for period ${reportData.period}`,
      });
    } catch (error: any) {
      toast.error("Failed to generate report", {
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

      const vatRate = 0.16; // 16% VAT (inclusive)
      
      const jobsWithVAT = jobs?.map(j => {
        const totalWithVAT = Number(j.cost);
        const netAmount = totalWithVAT / 1.16;
        const vat = totalWithVAT - netAmount;
        return { ...j, netAmount, vat, totalWithVAT };
      }) || [];

      const totalWithVAT = jobsWithVAT.reduce((sum, j) => sum + j.totalWithVAT, 0);
      const totalVAT = jobsWithVAT.reduce((sum, j) => sum + j.vat, 0);
      const netSales = jobsWithVAT.reduce((sum, j) => sum + j.netAmount, 0);

      const reportData = {
        period: `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        net_sales: netSales,
        vat_rate: vatRate,
        vat_amount: totalVAT,
        total_with_vat: totalWithVAT,
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
      
      // Load TPIN from settings
      const settings = JSON.parse(localStorage.getItem("netgenix_settings") || "{}");
      const tpin = settings.tpin || "Not Set";
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 14, 20);
      doc.setFontSize(14);
      doc.text("Monthly VAT Report", 14, 32);
      
      // Add watermark
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text("System Powered by ZEDZACK TECH", pageWidth - 14, 37, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.period}`, 14, 55);
      doc.text(`TPIN: ${tpin}`, 14, 62);
      
      doc.setFontSize(16);
      doc.text("VAT Summary", 14, 75);
      
      autoTable(doc, {
        startY: 80,
        head: [["Description", "Amount"]],
        body: [
          ["Total Amount (Incl. VAT)", `ZMW ${totalWithVAT.toFixed(2)}`],
          ["VAT Rate (Inclusive)", `${(vatRate * 100).toFixed(0)}%`],
          ["VAT Amount", `ZMW ${totalVAT.toFixed(2)}`],
          ["Net Sales (Excl. VAT)", `ZMW ${netSales.toFixed(2)}`],
          ["Number of Jobs", reportData.jobs_count.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      if (jobsWithVAT.length > 0) {
        doc.setFontSize(16);
        doc.text("Jobs Breakdown with VAT", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Client", "Job Type", "Total (Incl. VAT)", "VAT (16%)", "Net Amount"]],
          body: jobsWithVAT.map(j => [
            j.completion_date || "-",
            j.client_name,
            j.job_type,
            `ZMW ${j.totalWithVAT.toFixed(2)}`,
            `ZMW ${j.vat.toFixed(2)}`,
            `ZMW ${j.netAmount.toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Totals:", `ZMW ${totalWithVAT.toFixed(2)}`, `ZMW ${totalVAT.toFixed(2)}`, `ZMW ${netSales.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
        });
      }

      doc.save(`NetGenix-Monthly-VAT-Report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`);

      toast.success("📊 Monthly VAT Report Generated!", {
        description: `PDF downloaded for period ${reportData.period}`,
      });
    } catch (error: any) {
      toast.error("Failed to generate report", {
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Weekly Report</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateWeeklyReport} 
              disabled={generating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Weekly Report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-accent/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle>Monthly Report</CardTitle>
                <CardDescription>Custom date range summary</CardDescription>
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
              onClick={generateMonthlyReport} 
              disabled={generating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Monthly Report
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
                <CardTitle>Monthly VAT Report</CardTitle>
                <CardDescription>VAT breakdown per item</CardDescription>
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
