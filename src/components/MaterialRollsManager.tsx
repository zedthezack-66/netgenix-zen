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
import { Plus, Edit, Trash2, AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { Progress } from "@/components/ui/progress";

const MATERIAL_TYPES = ["Vinyl", "PVC Banner", "Banner Material", "DTF"] as const;
type MaterialType = typeof MATERIAL_TYPES[number];

interface MaterialRoll {
  id: string;
  roll_id: string;
  material_type: MaterialType;
  roll_width: number;
  initial_length: number;
  remaining_length: number;
  cost_per_sqm: number;
  selling_rate_per_sqm: number;
  alert_level: number;
  created_at: string;
}

export const MaterialRollsManager = () => {
  const [rolls, setRolls] = useState<MaterialRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rollToDelete, setRollToDelete] = useState<string | null>(null);
  const [editingRoll, setEditingRoll] = useState<MaterialRoll | null>(null);
  const [formData, setFormData] = useState({
    roll_id: "",
    material_type: "Vinyl" as MaterialType,
    roll_width: "",
    initial_length: "",
    cost_per_sqm: "",
    selling_rate_per_sqm: "",
    alert_level: "5",
  });

  useEffect(() => {
    fetchRolls();
  }, []);

  const fetchRolls = async () => {
    try {
      const { data, error } = await supabase
        .from("material_rolls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRolls((data as MaterialRoll[]) || []);
    } catch (error: any) {
      toast.error("Failed to load material rolls", {
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
      const rollData = {
        roll_id: formData.roll_id,
        material_type: formData.material_type,
        roll_width: parseFloat(formData.roll_width),
        initial_length: parseFloat(formData.initial_length),
        remaining_length: editingRoll 
          ? editingRoll.remaining_length 
          : parseFloat(formData.initial_length),
        cost_per_sqm: parseFloat(formData.cost_per_sqm),
        selling_rate_per_sqm: parseFloat(formData.selling_rate_per_sqm),
        alert_level: parseFloat(formData.alert_level),
      };

      if (editingRoll) {
        const { error } = await supabase
          .from("material_rolls")
          .update(rollData)
          .eq("id", editingRoll.id);

        if (error) throw error;
        toast.success("✅ Roll updated successfully!");
      } else {
        const { error } = await supabase.from("material_rolls").insert({
          ...rollData,
          created_by: user.id,
        });

        if (error) throw error;
        toast.success("✨ New roll added to inventory!");
      }

      setOpen(false);
      resetForm();
      fetchRolls();
    } catch (error: any) {
      toast.error("Failed to save roll", {
        description: error.message,
      });
    }
  };

  const handleDelete = async () => {
    if (!rollToDelete) return;

    try {
      const { error } = await supabase.from("material_rolls").delete().eq("id", rollToDelete);
      if (error) throw error;
      toast.success("🗑️ Roll deleted successfully!");
      fetchRolls();
    } catch (error: any) {
      toast.error("Failed to delete roll", {
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setRollToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      roll_id: "",
      material_type: "Vinyl",
      roll_width: "",
      initial_length: "",
      cost_per_sqm: "",
      selling_rate_per_sqm: "",
      alert_level: "5",
    });
    setEditingRoll(null);
  };

  const openEditDialog = (roll: MaterialRoll) => {
    setEditingRoll(roll);
    setFormData({
      roll_id: roll.roll_id,
      material_type: roll.material_type,
      roll_width: roll.roll_width.toString(),
      initial_length: roll.initial_length.toString(),
      cost_per_sqm: roll.cost_per_sqm.toString(),
      selling_rate_per_sqm: roll.selling_rate_per_sqm.toString(),
      alert_level: roll.alert_level.toString(),
    });
    setOpen(true);
  };

  const isLowStock = (roll: MaterialRoll) => roll.remaining_length <= roll.alert_level;

  const getRemainingPercentage = (roll: MaterialRoll) => 
    (roll.remaining_length / roll.initial_length) * 100;

  const getSqm = (roll: MaterialRoll) => roll.roll_width * roll.remaining_length;

  const exportToExcel = () => {
    const exportData = rolls.map(roll => ({
      "Roll ID": roll.roll_id,
      "Material Type": roll.material_type,
      "Width (m)": roll.roll_width,
      "Initial Length (m)": roll.initial_length,
      "Remaining Length (m)": roll.remaining_length,
      "Remaining SQM": (roll.roll_width * roll.remaining_length).toFixed(2),
      "Cost per SQM (ZMW)": roll.cost_per_sqm,
      "Selling Rate per SQM (ZMW)": roll.selling_rate_per_sqm,
      "Alert Level (m)": roll.alert_level,
      "Status": isLowStock(roll) ? "LOW STOCK" : "OK",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Material Rolls");
    XLSX.writeFile(wb, `NetGenix_Material_Rolls_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Material rolls exported to Excel!");
  };

  const lowStockCount = rolls.filter(isLowStock).length;

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Material Rolls Inventory</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track Vinyl, PVC, Banner, and DTF rolls with SQM calculations
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Roll
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingRoll ? "Edit Roll" : "Add New Roll"}</DialogTitle>
                    <DialogDescription>
                      Enter the roll specifications for inventory tracking
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="roll_id">Roll ID</Label>
                      <Input
                        id="roll_id"
                        value={formData.roll_id}
                        onChange={(e) => setFormData({ ...formData, roll_id: e.target.value })}
                        placeholder="e.g., VNL-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="material_type">Material Type</Label>
                      <Select
                        value={formData.material_type}
                        onValueChange={(value: MaterialType) => setFormData({ ...formData, material_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIAL_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="roll_width">Width (m)</Label>
                        <Input
                          id="roll_width"
                          type="number"
                          step="0.01"
                          value={formData.roll_width}
                          onChange={(e) => setFormData({ ...formData, roll_width: e.target.value })}
                          placeholder="1.22"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="initial_length">Length (m)</Label>
                        <Input
                          id="initial_length"
                          type="number"
                          step="0.01"
                          value={formData.initial_length}
                          onChange={(e) => setFormData({ ...formData, initial_length: e.target.value })}
                          placeholder="50"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cost_per_sqm">Cost/SQM (ZMW)</Label>
                        <Input
                          id="cost_per_sqm"
                          type="number"
                          step="0.01"
                          value={formData.cost_per_sqm}
                          onChange={(e) => setFormData({ ...formData, cost_per_sqm: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="selling_rate_per_sqm">Rate/SQM (ZMW)</Label>
                        <Input
                          id="selling_rate_per_sqm"
                          type="number"
                          step="0.01"
                          value={formData.selling_rate_per_sqm}
                          onChange={(e) => setFormData({ ...formData, selling_rate_per_sqm: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="alert_level">Alert Level (m)</Label>
                      <Input
                        id="alert_level"
                        type="number"
                        step="0.01"
                        value={formData.alert_level}
                        onChange={(e) => setFormData({ ...formData, alert_level: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingRoll ? "Update Roll" : "Add Roll"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lowStockCount > 0 && (
            <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium">
                {lowStockCount} roll{lowStockCount > 1 ? "s" : ""} below alert level
              </span>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>SQM Left</TableHead>
                <TableHead>Rate/SQM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading rolls...
                  </TableCell>
                </TableRow>
              ) : rolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No material rolls in inventory. Add your first roll!
                  </TableCell>
                </TableRow>
              ) : (
                rolls.map((roll) => (
                  <TableRow key={roll.id} className={isLowStock(roll) ? "bg-warning/5" : ""}>
                    <TableCell className="font-medium">{roll.roll_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roll.material_type}</Badge>
                    </TableCell>
                    <TableCell>{roll.roll_width}m</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span>{roll.remaining_length.toFixed(2)}m / {roll.initial_length}m</span>
                        <Progress 
                          value={getRemainingPercentage(roll)} 
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>{getSqm(roll).toFixed(2)} sqm</TableCell>
                    <TableCell>ZMW {roll.selling_rate_per_sqm.toFixed(2)}</TableCell>
                    <TableCell>
                      {isLowStock(roll) ? (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-success/20 text-success">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(roll)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRollToDelete(roll.id);
                          setDeleteDialogOpen(true);
                        }}
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
        title="Delete Roll"
        description="Are you sure you want to delete this roll? This action cannot be undone."
      />
    </>
  );
};
