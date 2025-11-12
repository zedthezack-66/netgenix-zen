import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2, FileText, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

interface Report {
  id: string;
  report_type: string;
  report_date: string;
  report_data: any;
  generated_at: string;
}

export const ReportHistory = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filterType, startDate, endDate]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("generated_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
      toast.success("📊 Reports loaded successfully", {
        description: `Found ${data?.length || 0} reports`,
      });
    } catch (error: any) {
      toast.error("Failed to load reports", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (filterType !== "all") {
      filtered = filtered.filter((report) => report.report_type === filterType);
    }

    if (startDate) {
      filtered = filtered.filter(
        (report) => new Date(report.report_date) >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (report) => new Date(report.report_date) <= endDate
      );
    }

    setFilteredReports(filtered);
  };

  const downloadReport = (report: Report) => {
    const blob = new Blob([JSON.stringify(report.report_data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.report_type}_${report.report_date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("📥 Report downloaded", {
      description: `${report.report_type} from ${format(new Date(report.report_date), "MMM dd, yyyy")}`,
    });
  };

  const handleDeleteClick = (reportId: string) => {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportToDelete);

      if (error) throw error;

      setReports(reports.filter((r) => r.id !== reportToDelete));
      toast.success("🗑️ Report deleted", {
        description: "Report removed from history",
      });
    } catch (error: any) {
      toast.error("Failed to delete report", {
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (loading) {
    return (
      <Card className="shadow-lg backdrop-blur-sm bg-card/95 animate-fadeIn">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading reports...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg backdrop-blur-sm bg-card/95 animate-fadeIn">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Report History & Archive
              </CardTitle>
              <CardDescription>View, download, and manage all generated reports</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">End Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="weekly">Weekly Reports</SelectItem>
                  <SelectItem value="monthly">Monthly Reports</SelectItem>
                  <SelectItem value="monthly_vat">Monthly VAT Reports</SelectItem>
                </SelectContent>
              </Select>
              {(filterType !== "all" || startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports found matching your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Report Date</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      {report.report_type === "weekly" && "Weekly Report"}
                      {report.report_type === "monthly" && "Monthly Report"}
                      {report.report_type === "monthly_vat" && "Monthly VAT Report"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.report_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(report.generated_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report)}
                          className="hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(report.id)}
                          className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Report"
        description="Are you sure you want to delete this report? This action cannot be undone."
      />
    </>
  );
};
