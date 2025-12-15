import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Download, Calendar as CalendarIcon, FileSpreadsheet, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import netgenixLogo from "@/assets/netgenix-logo.jpg";
import * as XLSX from "xlsx";

export const Reports = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [generating, setGenerating] = useState(false);

  // Helper function to convert image to base64
  const getImageBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

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

      // Save to database first
      const { error: insertError } = await supabase.from("reports").insert({
        report_type: "weekly",
        report_date: endDateStr,
        report_data: reportData as any,
      });

      if (insertError) {
        console.error("Failed to save report to database:", insertError);
        toast.error("Failed to save report to history", {
          description: insertError.message,
        });
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Add logo
      try {
        const logoBase64 = await getImageBase64(netgenixLogo);
        doc.addImage(logoBase64, 'JPEG', 14, 8, 24, 24);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 45, 20);
      doc.setFontSize(14);
      doc.text("Weekly Summary Report", 45, 32);
      
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
        
        const jobsTotal = jobs.data.reduce((sum, j) => sum + Number(j.cost), 0);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Client", "Job Type", "Cost"]],
          body: jobs.data.map(j => [
            j.completion_date || "-",
            j.client_name, 
            j.job_type, 
            `ZMW ${Number(j.cost).toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Total:", `ZMW ${jobsTotal.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
        });
      }

      if (expenses.data && expenses.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Expenses", 14, (doc as any).lastAutoTable.finalY + 15);
        
        const expensesListTotal = expenses.data.reduce((sum, e) => sum + Number(e.amount), 0);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Category", "Description", "Amount"]],
          body: expenses.data.map(e => [
            e.expense_date || "-",
            e.category, 
            e.description || "-", 
            `ZMW ${Number(e.amount).toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Total:", `ZMW ${expensesListTotal.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
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

      // Save to database first
      const { error: insertError } = await supabase.from("reports").insert({
        report_type: "monthly",
        report_date: endDate,
        report_data: reportData as any,
      });

      if (insertError) {
        console.error("Failed to save report to database:", insertError);
        toast.error("Failed to save report to history", {
          description: insertError.message,
        });
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Add logo
      try {
        const logoBase64 = await getImageBase64(netgenixLogo);
        doc.addImage(logoBase64, 'JPEG', 14, 8, 24, 24);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 45, 20);
      doc.setFontSize(14);
      doc.text("Monthly Summary Report", 45, 32);
      
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
        
        const jobsTotal = jobs.data.reduce((sum, j) => sum + Number(j.cost), 0);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Client", "Job Type", "Cost"]],
          body: jobs.data.map(j => [
            j.completion_date || "-",
            j.client_name, 
            j.job_type, 
            `ZMW ${Number(j.cost).toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Total:", `ZMW ${jobsTotal.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
        });
      }

      if (expenses.data && expenses.data.length > 0) {
        doc.setFontSize(16);
        doc.text("Expenses", 14, (doc as any).lastAutoTable.finalY + 15);
        
        const expensesListTotal = expenses.data.reduce((sum, e) => sum + Number(e.amount), 0);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Category", "Description", "Amount"]],
          body: expenses.data.map(e => [
            e.expense_date || "-",
            e.category, 
            e.description || "-", 
            `ZMW ${Number(e.amount).toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Total:", `ZMW ${expensesListTotal.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
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

  const generateTurnoverTaxReport = async () => {
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

      const turnoverTaxRate = 0.05; // 5% Turnover Tax
      
      const jobsWithTax = jobs?.map(j => {
        const grossSales = Number(j.cost);
        const turnoverTax = grossSales * turnoverTaxRate;
        const netRevenue = grossSales - turnoverTax;
        return { ...j, grossSales, turnoverTax, netRevenue };
      }) || [];

      const totalGrossSales = jobsWithTax.reduce((sum, j) => sum + j.grossSales, 0);
      const totalTurnoverTax = jobsWithTax.reduce((sum, j) => sum + j.turnoverTax, 0);
      const totalNetRevenue = jobsWithTax.reduce((sum, j) => sum + j.netRevenue, 0);

      const reportData = {
        period: `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        gross_sales: totalGrossSales,
        turnover_tax_rate: turnoverTaxRate,
        turnover_tax_amount: totalTurnoverTax,
        net_revenue: totalNetRevenue,
        jobs_count: jobs?.length || 0,
      };

      // Save to database first
      const { error: insertError } = await supabase.from("reports").insert({
        report_type: "turnover_tax",
        report_date: endDate,
        report_data: reportData as any,
      });

      if (insertError) {
        console.error("Failed to save report to database:", insertError);
        toast.error("Failed to save report to history", {
          description: insertError.message,
        });
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Load TPIN from settings
      const settings = JSON.parse(localStorage.getItem("netgenix_settings") || "{}");
      const tpin = settings.tpin || "Not Set";
      
      // Add logo
      try {
        const logoBase64 = await getImageBase64(netgenixLogo);
        doc.addImage(logoBase64, 'JPEG', 14, 8, 24, 24);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 45, 20);
      doc.setFontSize(14);
      doc.text("Turnover Tax Report", 45, 32);
      
      // Add watermark
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text("System Powered by ZEDZACK TECH", pageWidth - 14, 37, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.period}`, 14, 55);
      doc.text(`TPIN: ${tpin}`, 14, 62);
      
      doc.setFontSize(16);
      doc.text("Turnover Tax Summary", 14, 75);
      
      autoTable(doc, {
        startY: 80,
        head: [["Description", "Amount"]],
        body: [
          ["Gross Sales", `ZMW ${totalGrossSales.toFixed(2)}`],
          ["Turnover Tax Rate", `${(turnoverTaxRate * 100).toFixed(0)}%`],
          ["Turnover Tax Amount", `ZMW ${totalTurnoverTax.toFixed(2)}`],
          ["Net Revenue (After Tax)", `ZMW ${totalNetRevenue.toFixed(2)}`],
          ["Number of Jobs", reportData.jobs_count.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      if (jobsWithTax.length > 0) {
        doc.setFontSize(16);
        doc.text("Jobs Breakdown with Turnover Tax", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Date", "Client", "Job Type", "Gross Sales", "Turnover Tax (5%)", "Net Revenue"]],
          body: jobsWithTax.map(j => [
            j.completion_date || "-",
            j.client_name,
            j.job_type,
            `ZMW ${j.grossSales.toFixed(2)}`,
            `ZMW ${j.turnoverTax.toFixed(2)}`,
            `ZMW ${j.netRevenue.toFixed(2)}`
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          foot: [["", "", "Totals:", `ZMW ${totalGrossSales.toFixed(2)}`, `ZMW ${totalTurnoverTax.toFixed(2)}`, `ZMW ${totalNetRevenue.toFixed(2)}`]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
        });
      }

      doc.save(`NetGenix-Turnover-Tax-Report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`);

      toast.success("📊 Turnover Tax Report Generated!", {
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

  const generateMaterialUsageReport = async () => {
    setGenerating(true);
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      // Fetch material rolls
      const { data: rolls } = await supabase.from("material_rolls").select("*");
      
      // Fetch jobs with material usage in date range
      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .gte("completion_date", startDate)
        .lte("completion_date", endDate)
        .not("material_roll_id", "is", null);

      // Calculate usage per roll
      const rollUsage = (rolls || []).map((roll: any) => {
        const rollJobs = (jobs || []).filter((j: any) => j.material_roll_id === roll.id);
        const sqmPrinted = rollJobs.reduce((sum: number, j: any) => sum + (Number(j.sqm_used) || 0), 0);
        const lengthUsed = rollJobs.reduce((sum: number, j: any) => sum + (Number(j.length_deducted) || 0), 0);
        const revenueGenerated = rollJobs.reduce((sum: number, j: any) => sum + Number(j.cost), 0);
        const costConsumed = sqmPrinted * Number(roll.cost_per_sqm);
        const isLowStock = Number(roll.remaining_length) <= Number(roll.alert_level);
        
        return {
          ...roll,
          sqmPrinted,
          lengthUsed,
          revenueGenerated,
          costConsumed,
          profit: revenueGenerated - costConsumed,
          isLowStock,
        };
      });

      const lowStockRolls = rollUsage.filter((r: any) => r.isLowStock);
      const totalRevenue = rollUsage.reduce((sum: number, r: any) => sum + r.revenueGenerated, 0);
      const totalCost = rollUsage.reduce((sum: number, r: any) => sum + r.costConsumed, 0);

      // Save to database
      const reportData = {
        period: `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        profit: totalRevenue - totalCost,
        rolls_count: rolls?.length || 0,
        low_stock_count: lowStockRolls.length,
      };

      await supabase.from("reports").insert({
        report_type: "material_usage",
        report_date: endDate,
        report_data: reportData as any,
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      try {
        const logoBase64 = await getImageBase64(netgenixLogo);
        doc.addImage(logoBase64, 'JPEG', 14, 8, 24, 24);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("NetGenix", 45, 20);
      doc.setFontSize(14);
      doc.text("Material Usage Report", 45, 32);
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text("System Powered by ZEDZACK TECH", pageWidth - 14, 37, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Period: ${reportData.period}`, 14, 55);
      
      doc.setFontSize(16);
      doc.text("Usage Summary", 14, 70);
      
      autoTable(doc, {
        startY: 75,
        head: [["Metric", "Value"]],
        body: [
          ["Total Rolls", (rolls?.length || 0).toString()],
          ["Revenue from Materials", `ZMW ${totalRevenue.toFixed(2)}`],
          ["Material Cost Consumed", `ZMW ${totalCost.toFixed(2)}`],
          ["Net Profit", `ZMW ${(totalRevenue - totalCost).toFixed(2)}`],
          ["Low Stock Rolls", lowStockRolls.length.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
      });

      if (rollUsage.length > 0) {
        doc.setFontSize(16);
        doc.text("Roll Usage Details", 14, (doc as any).lastAutoTable.finalY + 15);
        
        const totalSqmUsed = rollUsage.reduce((sum: number, r: any) => sum + r.sqmPrinted, 0);
        const totalLengthUsed = rollUsage.reduce((sum: number, r: any) => sum + r.lengthUsed, 0);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Roll ID", "Type", "SQM Used", "Length Used", "Remaining", "Revenue", "Cost", "Status"]],
          body: rollUsage.map((r: any) => [
            r.roll_id,
            r.material_type,
            r.sqmPrinted.toFixed(2),
            `${r.lengthUsed.toFixed(2)}m`,
            `${Number(r.remaining_length).toFixed(2)}m`,
            `ZMW ${r.revenueGenerated.toFixed(2)}`,
            `ZMW ${r.costConsumed.toFixed(2)}`,
            r.isLowStock ? "LOW" : "OK"
          ]),
          theme: "striped",
          headStyles: { fillColor: [14, 165, 233] },
          styles: { fontSize: 8 },
          foot: [["", "Totals:", totalSqmUsed.toFixed(2), `${totalLengthUsed.toFixed(2)}m`, "", `ZMW ${totalRevenue.toFixed(2)}`, `ZMW ${totalCost.toFixed(2)}`, ""]],
          footStyles: { fillColor: [14, 165, 233], fontStyle: "bold", fontSize: 8 },
        });
      }

      if (lowStockRolls.length > 0) {
        doc.setFontSize(16);
        doc.text("Low Stock Alert", 14, (doc as any).lastAutoTable.finalY + 15);
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Roll ID", "Type", "Remaining", "Alert Level"]],
          body: lowStockRolls.map((r: any) => [
            r.roll_id,
            r.material_type,
            `${Number(r.remaining_length).toFixed(2)}m`,
            `${Number(r.alert_level)}m`
          ]),
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68] },
        });
      }

      doc.save(`NetGenix-Material-Usage-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`);

      toast.success("📊 Material Usage Report Generated!", {
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

  const exportMaterialUsageCSV = async () => {
    setGenerating(true);
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const { data: rolls } = await supabase.from("material_rolls").select("*");
      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .gte("completion_date", startDate)
        .lte("completion_date", endDate)
        .not("material_roll_id", "is", null);

      // Roll Summary Sheet
      const rollUsage = (rolls || []).map((roll: any) => {
        const rollJobs = (jobs || []).filter((j: any) => j.material_roll_id === roll.id);
        const sqmPrinted = rollJobs.reduce((sum: number, j: any) => sum + (Number(j.sqm_used) || 0), 0);
        const lengthUsed = rollJobs.reduce((sum: number, j: any) => sum + (Number(j.length_deducted) || 0), 0);
        const revenueGenerated = rollJobs.reduce((sum: number, j: any) => sum + Number(j.cost), 0);
        const costConsumed = sqmPrinted * Number(roll.cost_per_sqm);
        
        return {
          "Roll ID": roll.roll_id,
          "Material Type": roll.material_type,
          "Roll Width (m)": roll.roll_width,
          "Initial Length (m)": roll.initial_length,
          "Remaining Length (m)": Number(roll.remaining_length).toFixed(2),
          "SQM Printed": sqmPrinted.toFixed(2),
          "Length Used (m)": lengthUsed.toFixed(2),
          "Rate/SQM (ZMW)": roll.selling_rate_per_sqm,
          "Revenue (ZMW)": revenueGenerated.toFixed(2),
          "Alert Level (m)": roll.alert_level,
          "Status": Number(roll.remaining_length) <= Number(roll.alert_level) ? "LOW STOCK" : "OK",
        };
      });

      // Individual Jobs Sheet with dates
      const jobsData = (jobs || []).map((job: any) => {
        const roll = (rolls || []).find((r: any) => r.id === job.material_roll_id);
        return {
          "Date": job.completion_date || job.created_at?.split('T')[0] || "-",
          "Client": job.client_name,
          "Job Type": job.job_type,
          "Roll ID": roll?.roll_id || "-",
          "Material Type": roll?.material_type || "-",
          "SQM Used": Number(job.sqm_used || 0).toFixed(2),
          "Length Used (m)": Number(job.length_deducted || 0).toFixed(2),
          "Cost (ZMW)": Number(job.cost).toFixed(2),
        };
      });

      // Add totals row to jobs
      const totalSqm = (jobs || []).reduce((sum: number, j: any) => sum + Number(j.sqm_used || 0), 0);
      const totalLength = (jobs || []).reduce((sum: number, j: any) => sum + Number(j.length_deducted || 0), 0);
      const totalRevenue = (jobs || []).reduce((sum: number, j: any) => sum + Number(j.cost), 0);
      jobsData.push({
        "Date": "",
        "Client": "",
        "Job Type": "",
        "Roll ID": "",
        "Material Type": "TOTALS:",
        "SQM Used": totalSqm.toFixed(2),
        "Length Used (m)": totalLength.toFixed(2),
        "Cost (ZMW)": totalRevenue.toFixed(2),
      });

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(rollUsage);
      const wsJobs = XLSX.utils.json_to_sheet(jobsData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Roll Summary");
      XLSX.utils.book_append_sheet(wb, wsJobs, "Job Details");
      XLSX.writeFile(wb, `NetGenix-Material-Usage-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.xlsx`);

      toast.success("📊 Material Usage CSV Exported!");
    } catch (error: any) {
      toast.error("Failed to export CSV", {
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
                <CardTitle>Turnover Tax Report</CardTitle>
                <CardDescription>5% Turnover Tax breakdown</CardDescription>
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
              onClick={generateTurnoverTaxReport} 
              disabled={generating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Tax Report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-success/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <ScrollText className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Material Usage Report</CardTitle>
                <CardDescription>Roll usage and stock summary</CardDescription>
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
            <div className="flex gap-2">
              <Button 
                onClick={generateMaterialUsageReport} 
                disabled={generating}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button 
                onClick={exportMaterialUsageCSV} 
                disabled={generating}
                variant="outline"
                className="flex-1"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
