import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

interface Job {
  id: string;
  client_name: string;
  job_type: string;
  materials_used: string;
  cost: number;
  status: string;
  completion_date: string | null;
  created_at: string;
}

export const JobsManager = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    client_name: "",
    job_type: "",
    materials_used: "",
    cost: "",
    status: "pending",
    completion_date: "",
  });

  useEffect(() => {
    fetchJobs();
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
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }
    
    setFilteredJobs(filtered);
  }, [jobs, searchQuery, statusFilter]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast.error("Failed to load jobs", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (editingJob) {
        const { error } = await supabase
          .from("jobs")
          .update({
            ...formData,
            cost: parseFloat(formData.cost),
          })
          .eq("id", editingJob.id);

        if (error) throw error;
        toast.success("✅ Job updated successfully!", {
          description: `${formData.client_name} - ${formData.job_type}`,
        });
      } else {
        const { error } = await supabase.from("jobs").insert({
          ...formData,
          cost: parseFloat(formData.cost),
          created_by: user.id,
        });

        if (error) throw error;
        toast.success("✨ Job created successfully!", {
          description: `${formData.client_name} - ${formData.job_type}`,
        });
      }

      setOpen(false);
      resetForm();
      fetchJobs();
    } catch (error: any) {
      toast.error("Failed to save job", {
        description: error.message,
      });
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;

    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobToDelete);
      if (error) throw error;
      toast.success("🗑️ Job deleted successfully!", {
        description: "Job has been removed from the system",
      });
      fetchJobs();
    } catch (error: any) {
      toast.error("Failed to delete job", {
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setJobToDelete(id);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_name: "",
      job_type: "",
      materials_used: "",
      cost: "",
      status: "pending",
      completion_date: "",
    });
    setEditingJob(null);
  };

  const openEditDialog = (job: Job) => {
    setEditingJob(job);
    setFormData({
      client_name: job.client_name,
      job_type: job.job_type,
      materials_used: job.materials_used || "",
      cost: job.cost.toString(),
      status: job.status,
      completion_date: job.completion_date || "",
    });
    setOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline", className: string }> = {
      pending: { variant: "outline", className: "border-warning text-warning" },
      in_progress: { variant: "secondary", className: "bg-secondary" },
      completed: { variant: "default", className: "bg-success" },
    };
    const { variant, className } = config[status] || config.pending;
    return (
      <Badge variant={variant} className={className}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl">Jobs Management</CardTitle>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingJob ? "Edit Job" : "Create New Job"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the printing/embroidery job
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) =>
                      setFormData({ ...formData, client_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="job_type">Job Type</Label>
                  <Input
                    id="job_type"
                    value={formData.job_type}
                    onChange={(e) =>
                      setFormData({ ...formData, job_type: e.target.value })
                    }
                    placeholder="e.g., T-shirt printing, Logo embroidery"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="materials_used">Materials Used</Label>
                  <Input
                    id="materials_used"
                    value={formData.materials_used}
                    onChange={(e) =>
                      setFormData({ ...formData, materials_used: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="completion_date">Completion Date</Label>
                  <Input
                    id="completion_date"
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) =>
                      setFormData({ ...formData, completion_date: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingJob ? "Update Job" : "Create Job"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No jobs found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.client_name}</TableCell>
                <TableCell>{job.job_type}</TableCell>
                <TableCell>ZMW {job.cost.toFixed(2)}</TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell>
                  {job.completion_date
                    ? new Date(job.completion_date).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(job)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(job.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onConfirm={handleDelete}
      title="Delete Job"
      description="Are you sure you want to delete this job? This action cannot be undone."
    />
    </>
  );
};
