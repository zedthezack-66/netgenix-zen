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
import { Plus, Edit, Trash2, Search, Check, ChevronsUpDown, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { MaterialJobForm } from "@/components/MaterialJobForm";

const JOB_TYPES = [
  "Shirt Embroidery",
  "Corporate Logo Embroidery",
  "Name Embroidery",
  "School Badge Embroidery",
  "Cap Embroidery",
  "3D Puff Embroidery",
  "Patch Embroidery",
  "Towel Embroidery",
  "Jacket Embroidery",
  "Bag Embroidery",
  "T-shirt Printing",
  "Hoodie Printing",
  "Vinyl Heat Press Printing",
  "Screen Printing",
  "Direct-to-Garment (DTG) Printing",
  "Jersey Number Printing",
  "Reflective Printing",
  "Apron Printing",
  "Tote Bag Printing",
  "Business Cards",
  "Flyers",
  "Posters",
  "Brochures",
  "Booklets",
  "Stickers",
  "Product Labels",
  "Letterheads",
  "Envelopes",
  "NCR Receipt Books",
  "Invoice Books",
  "Delivery Note Books",
  "Purchase Order Books",
  "Notepads",
  "Desk Calendars",
  "Wall Calendars",
  "Diaries",
  "Presentation Folders",
  "Branded Mugs",
  "Branded Water Bottles",
  "Branded Pens",
  "Lanyards",
  "Keyholders",
  "Wristbands",
  "Mousepads",
  "Umbrellas",
  "Caps",
  "USB Flash Drives",
  "PVC Banners",
  "Roll-Up Banners",
  "Teardrop Flags",
  "Vinyl Stickers",
  "Vehicle Branding",
  "Shop Signage",
  "Backdrop Banners",
  "Mesh Banners",
  "Window Graphics",
  "Billboards",
  "Custom Boxes",
  "Paper Bags",
  "Gift Bags",
  "Clothing Tags",
  "Food Packaging Stickers",
  "Product Sleeves",
  "Uniform Manufacturing",
  "Custom Cap Manufacturing",
  "Patch Production",
  "Event Branding (Full Package)",
  "Company Uniform Packages",
  "School Uniform Branding",
];

const PAYMENT_MODES = ["Cash", "Mobile Money", "Credit"] as const;

interface Job {
  id: string;
  client_name: string;
  job_type: string;
  materials_used: string;
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
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    job_type: "",
    materials_used: "",
    cost: "",
    status: "in_progress",
    completion_date: "",
    payment_received: "",
    payment_mode: "",
    received_by: "",
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
      // Only fetch non-completed jobs for active job management
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .neq("status", "completed")
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

    // Block completion if no payment recorded
    const paymentAmount = parseFloat(formData.payment_received) || 0;
    if (formData.status === "completed" && paymentAmount <= 0) {
      toast.error("Cannot mark as Completed", {
        description: "Payment must be recorded before completing a job",
      });
      return;
    }

    try {
      const jobData = {
        client_name: formData.client_name,
        job_type: formData.job_type,
        materials_used: formData.materials_used,
        cost: parseFloat(formData.cost),
        status: formData.status,
        completion_date: formData.status === "completed" ? (formData.completion_date || new Date().toISOString().split("T")[0]) : formData.completion_date || null,
        payment_received: paymentAmount,
        payment_mode: formData.payment_mode || null,
        received_by: formData.received_by || null,
        payment_at: formData.status === "completed" && paymentAmount > 0 ? new Date().toISOString() : null,
      };

      if (editingJob) {
        const { error } = await supabase
          .from("jobs")
          .update(jobData)
          .eq("id", editingJob.id);

        if (error) throw error;
        toast.success(formData.status === "completed" ? "✅ Job completed!" : "✅ Job updated!", {
          description: `${formData.client_name} - ${formData.job_type}`,
        });
      } else {
        const { error } = await supabase.from("jobs").insert({
          ...jobData,
          created_by: user.id,
        });

        if (error) throw error;
        toast.success("✨ Job created!", {
          description: `${formData.client_name} - ${formData.job_type} (In Progress)`,
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
      status: "in_progress",
      completion_date: "",
      payment_received: "",
      payment_mode: "",
      received_by: "",
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
      payment_received: (job.payment_received || "").toString(),
      payment_mode: job.payment_mode || "",
      received_by: job.received_by || "",
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

  const exportToExcel = () => {
    const exportData = filteredJobs.map(job => ({
      "Job ID": job.id.substring(0, 8),
      "Client Name": job.client_name,
      "Job Type": job.job_type,
      "Materials Used": job.materials_used || "N/A",
      "Cost (ZMW)": job.cost,
      "Status": job.status,
      "Completion Date": job.completion_date || "N/A",
      "Created At": new Date(job.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    XLSX.writeFile(wb, `NetGenix_Jobs_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Jobs exported to Excel successfully!");
  };

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl">Jobs Management</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <MaterialJobForm onJobCreated={fetchJobs} />
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
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between"
                      >
                        {formData.job_type || "Select or type job type..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search or type custom job type..." 
                          value={formData.job_type}
                          onValueChange={(value) => setFormData({ ...formData, job_type: value })}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-2 px-2 text-sm">
                              Press Enter to use "{formData.job_type}" as custom job type
                            </div>
                          </CommandEmpty>
                          <CommandGroup heading="Embroidery Services">
                            {JOB_TYPES.slice(0, 10).map((type) => (
                              <CommandItem
                                key={type}
                                value={type}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, job_type: currentValue });
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.job_type === type ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {type}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Printing Services">
                            {JOB_TYPES.slice(10, 19).map((type) => (
                              <CommandItem
                                key={type}
                                value={type}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, job_type: currentValue });
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.job_type === type ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {type}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Corporate & Office">
                            {JOB_TYPES.slice(19, 38).map((type) => (
                              <CommandItem
                                key={type}
                                value={type}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, job_type: currentValue });
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.job_type === type ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {type}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Promotional Branding">
                            {JOB_TYPES.slice(38, 47).map((type) => (
                              <CommandItem
                                key={type}
                                value={type}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, job_type: currentValue });
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.job_type === type ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {type}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Signage & Large Format">
                            {JOB_TYPES.slice(47, 57).map((type) => (
                              <CommandItem
                                key={type}
                                value={type}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, job_type: currentValue });
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.job_type === type ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {type}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Packaging & Special Services">
                            {JOB_TYPES.slice(57).map((type) => (
                              <CommandItem
                                key={type}
                                value={type}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, job_type: currentValue });
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.job_type === type ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {type}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  <Label htmlFor="cost">Cost (ZMW)</Label>
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
                    onValueChange={(value) => {
                      // Block changing to completed if no payment
                      if (value === "completed" && (!formData.payment_received || parseFloat(formData.payment_received) <= 0)) {
                        toast.error("Payment required", {
                          description: "Record payment before marking as Completed",
                        });
                        return;
                      }
                      setFormData({ ...formData, status: value })
                    }}
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
                  {formData.status !== "completed" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment must be recorded to complete
                    </p>
                  )}
                </div>
                
                {/* Payment Section */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-3 block">Payment Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="payment_received" className="text-xs">Amount (ZMW)</Label>
                      <Input
                        id="payment_received"
                        type="number"
                        step="0.01"
                        value={formData.payment_received}
                        onChange={(e) => setFormData({ ...formData, payment_received: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_mode" className="text-xs">Method</Label>
                      <Select
                        value={formData.payment_mode}
                        onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_MODES.map((mode) => (
                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label htmlFor="received_by" className="text-xs">Received By</Label>
                    <Input
                      id="received_by"
                      value={formData.received_by}
                      onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
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
              <SelectItem value="all">All Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Completed jobs automatically move to Job History tab
        </p>
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
