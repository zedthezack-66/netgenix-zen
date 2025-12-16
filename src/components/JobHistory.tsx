import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Download, Calendar, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

interface Job {
  id: string;
  client_name: string;
  job_type: string;
  materials_used: string | null;
  cost: number;
  status: string;
  completion_date: string | null;
  created_at: string;
  sqm_used?: number;
  length_deducted?: number;
  material_roll_id?: string;
  payment_received?: number;
  payment_mode?: string;
  received_by?: string;
  payment_at?: string;
}

export const JobHistory = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  useEffect(() => {
    fetchCompletedJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;
    
    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.job_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (dateFilter === "custom" && startDate && endDate) {
      filtered = filtered.filter((job) => {
        const jobDate = job.completion_date ? new Date(job.completion_date) : new Date(job.created_at);
        return jobDate >= new Date(startDate) && jobDate <= new Date(endDate);
      });
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter((job) => {
        const jobDate = job.completion_date ? new Date(job.completion_date) : new Date(job.created_at);
        return jobDate >= weekAgo;
      });
    } else if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter((job) => {
        const jobDate = job.completion_date ? new Date(job.completion_date) : new Date(job.created_at);
        return jobDate >= monthAgo;
      });
    }
    
    setFilteredJobs(filtered);
  }, [jobs, searchQuery, dateFilter, startDate, endDate]);

  const fetchCompletedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "completed")
        .order("completion_date", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast.error("Failed to load job history", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deleteJobId) return;
    
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", deleteJobId);

      if (error) throw error;
      
      setJobs(jobs.filter(job => job.id !== deleteJobId));
      toast.success("Job deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete job", { description: error.message });
    } finally {
      setDeleteJobId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("status", "completed");

      if (error) throw error;
      
      setJobs([]);
      toast.success("All job history cleared");
    } catch (error: any) {
      toast.error("Failed to clear job history", { description: error.message });
    } finally {
      setShowClearAllDialog(false);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredJobs.map(job => ({
      "Job ID": job.id.substring(0, 8),
      "Client Name": job.client_name,
      "Job Type": job.job_type,
      "Materials Used": job.materials_used || "N/A",
      "Cost (ZMW)": job.cost,
      "Payment Received (ZMW)": job.payment_received || 0,
      "Payment Mode": job.payment_mode || "N/A",
      "Received By": job.received_by || "N/A",
      "Payment Date": job.payment_at ? new Date(job.payment_at).toLocaleDateString() : "N/A",
      "SQM Used": job.sqm_used?.toFixed(2) || "N/A",
      "Completion Date": job.completion_date ? new Date(job.completion_date).toLocaleDateString() : "N/A",
      "Created At": new Date(job.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Job History");
    XLSX.writeFile(wb, `NetGenix_JobHistory_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Job history exported to Excel!");
  };

  const totalRevenue = filteredJobs.reduce((sum, job) => sum + (job.payment_received || job.cost), 0);
  const totalJobs = filteredJobs.length;

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Job History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {totalJobs} completed jobs • ZMW {totalRevenue.toFixed(2)} total revenue
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              {jobs.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowClearAllDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or job type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === "custom" && (
            <div className="flex gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1"
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading job history...
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No completed jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.client_name}</TableCell>
                      <TableCell>{job.job_type}</TableCell>
                      <TableCell>ZMW {job.cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="text-success font-medium">
                          ZMW {(job.payment_received || job.cost).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {job.payment_mode || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.completion_date
                          ? new Date(job.completion_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteJobId(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteJobId}
        onOpenChange={(open) => !open && setDeleteJobId(null)}
        onConfirm={handleDeleteJob}
        title="Delete Job"
        description="Are you sure you want to delete this job from history? This action cannot be undone."
      />

      <ConfirmDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
        onConfirm={handleClearAll}
        title="Clear All Job History"
        description="Are you sure you want to delete ALL completed jobs from history? This action cannot be undone."
        confirmText="Clear All"
      />
    </>
  );
};