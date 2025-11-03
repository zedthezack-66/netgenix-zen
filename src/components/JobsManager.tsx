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
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    client_name: "",
    job_type: "",
    materials_used: "",
    cost: "",
    status: "pending",
    completion_date: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching jobs",
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
        toast({ title: "Job updated successfully!" });
      } else {
        const { error } = await supabase.from("jobs").insert({
          ...formData,
          cost: parseFloat(formData.cost),
          created_by: user.id,
        });

        if (error) throw error;
        toast({ title: "Job created successfully!" });
      }

      setOpen(false);
      resetForm();
      fetchJobs();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Job deleted successfully!" });
      fetchJobs();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
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
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "outline",
      in_progress: "secondary",
      completed: "default",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Jobs Management</CardTitle>
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
      <CardContent>
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
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.client_name}</TableCell>
                <TableCell>{job.job_type}</TableCell>
                <TableCell>${job.cost.toFixed(2)}</TableCell>
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
                    onClick={() => handleDelete(job.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
