import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Search, Download, Calendar, Trash2, Lock } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  job_quantity?: number;
  price_per_item?: number;
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingDeleteAction, setPendingDeleteAction] = useState<"single" | "all" | null>(null);

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

  const initiateDelete = (jobId: string) => {
    setDeleteJobId(jobId);
    setPendingDeleteAction("single");
    setPasswordDialogOpen(true);
  };

  const initiateClearAll = () => {
    setPendingDeleteAction("all");
    setPasswordDialogOpen(true);
  };

  const verifyAdminPassword = () => {
    const settings = localStorage.getItem("netgenix_settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.adminPassword && parsed.adminPassword === passwordInput) {
        if (pendingDeleteAction === "single") {
          handleDeleteJob();
        } else if (pendingDeleteAction === "all") {
          handleClearAll();
        }
        setPasswordDialogOpen(false);
        setPasswordInput("");
        setPendingDeleteAction(null);
        return;
      }
    }
    toast.error("Incorrect admin password", {
      description: "Please enter the correct admin password to delete jobs",
    });
    setPasswordInput("");
  };

  const handleDeleteJob = async () => {
    if (!deleteJobId) return;
    
    try {
      // Find the job to get material info
      const jobToDelete = jobs.find(j => j.id === deleteJobId);
      
      // Restore material to roll if applicable
      if (jobToDelete?.material_roll_id && (jobToDelete.length_deducted || jobToDelete.sqm_used)) {
        const materialToRestore = jobToDelete.length_deducted || jobToDelete.sqm_used || 0;
        
        const { data: roll, error: rollFetchError } = await supabase
          .from("material_rolls")
          .select("remaining_length")
          .eq("id", jobToDelete.material_roll_id)
          .maybeSingle();

        if (rollFetchError) throw rollFetchError;

        if (roll) {
          const { error: rollUpdateError } = await supabase
            .from("material_rolls")
            .update({ remaining_length: roll.remaining_length + materialToRestore })
            .eq("id", jobToDelete.material_roll_id);

          if (rollUpdateError) throw rollUpdateError;
        }
      }

      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", deleteJobId);

      if (error) throw error;
      
      const restoredMsg = jobToDelete?.length_deducted || jobToDelete?.sqm_used 
        ? ` (${(jobToDelete.length_deducted || jobToDelete.sqm_used)?.toFixed(2)} restored to roll)`
        : "";
      
      setJobs(jobs.filter(job => job.id !== deleteJobId));
      toast.success(`Job deleted${restoredMsg}`);
    } catch (error: any) {
      toast.error("Failed to delete job", { description: error.message });
    } finally {
      setDeleteJobId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      // Get all material jobs and aggregate by roll
      const materialJobs = jobs.filter(j => j.material_roll_id && (j.length_deducted || j.sqm_used));
      const rollUpdates: Record<string, number> = {};
      
      for (const job of materialJobs) {
        const rollId = job.material_roll_id!;
        const amount = job.length_deducted || job.sqm_used || 0;
        rollUpdates[rollId] = (rollUpdates[rollId] || 0) + amount;
      }

      // Restore material to each affected roll
      for (const [rollId, amountToRestore] of Object.entries(rollUpdates)) {
        const { data: roll, error: rollFetchError } = await supabase
          .from("material_rolls")
          .select("remaining_length")
          .eq("id", rollId)
          .maybeSingle();

        if (rollFetchError) throw rollFetchError;

        if (roll) {
          const { error: rollUpdateError } = await supabase
            .from("material_rolls")
            .update({ remaining_length: roll.remaining_length + amountToRestore })
            .eq("id", rollId);

          if (rollUpdateError) throw rollUpdateError;
        }
      }

      // Delete all completed jobs
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("status", "completed");

      if (error) throw error;
      
      const totalRestored = Object.values(rollUpdates).reduce((sum, val) => sum + val, 0);
      const restoredMsg = totalRestored > 0 ? ` (${totalRestored.toFixed(2)} total restored to rolls)` : "";
      
      setJobs([]);
      toast.success(`All job history cleared${restoredMsg}`);
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
      "Quantity": job.job_quantity || 1,
      "Price per Item (ZMW)": job.price_per_item?.toFixed(2) || "N/A",
      "Total Cost (ZMW)": job.cost,
      "Materials Used": job.materials_used || "N/A",
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
                  onClick={initiateClearAll}
                >
                  <Lock className="mr-2 h-4 w-4" />
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
                  <TableHead>Qty</TableHead>
                  <TableHead>Price/Item</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading job history...
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No completed jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.client_name}</TableCell>
                      <TableCell>{job.job_type}</TableCell>
                      <TableCell>{job.job_quantity || 1}</TableCell>
                      <TableCell>{job.price_per_item ? `ZMW ${job.price_per_item.toFixed(2)}` : "-"}</TableCell>
                      <TableCell className="font-medium">ZMW {job.cost.toFixed(2)}</TableCell>
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
                          onClick={() => initiateDelete(job.id)}
                        >
                          <Lock className="h-4 w-4" />
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

      {/* Admin Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) {
          setPasswordInput("");
          setPendingDeleteAction(null);
          setDeleteJobId(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Admin Verification Required
            </DialogTitle>
            <DialogDescription>
              Enter the admin password to delete {pendingDeleteAction === "all" ? "all jobs" : "this job"} from history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminPassword">Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyAdminPassword();
                }}
                placeholder="Enter admin password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPasswordInput("");
                  setPendingDeleteAction(null);
                  setDeleteJobId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={verifyAdminPassword}
                disabled={!passwordInput}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};