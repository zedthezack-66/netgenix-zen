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

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
  cost_per_unit: number;
  created_at: string;
}

export const MaterialsManager = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "",
    threshold: "",
    cost_per_unit: "",
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast.error("Failed to load materials", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const materialData = {
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        threshold: parseFloat(formData.threshold),
        cost_per_unit: parseFloat(formData.cost_per_unit),
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("materials")
          .update(materialData)
          .eq("id", editingMaterial.id);

        if (error) throw error;
        toast.success("✅ Material updated successfully!", {
          description: `${formData.name} - ${formData.quantity} ${formData.unit}`,
        });
      } else {
        const { error } = await supabase.from("materials").insert(materialData);

        if (error) throw error;
        toast.success("✨ Material created successfully!", {
          description: `${formData.name} - ${formData.quantity} ${formData.unit}`,
        });
      }

      setOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      toast.error("Failed to save material", {
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
      toast.success("🗑️ Material deleted successfully!", {
        description: "Material has been removed from inventory",
      });
      fetchMaterials();
    } catch (error: any) {
      toast.error("Failed to delete material", {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      quantity: "",
      unit: "",
      threshold: "",
      cost_per_unit: "",
    });
    setEditingMaterial(null);
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      quantity: material.quantity.toString(),
      unit: material.unit,
      threshold: material.threshold.toString(),
      cost_per_unit: material.cost_per_unit.toString(),
    });
    setOpen(true);
  };

  const isLowStock = (material: Material) => {
    return material.quantity < material.threshold;
  };

  const exportToExcel = () => {
    const exportData = materials.map(material => ({
      "Material Name": material.name,
      "Quantity": material.quantity,
      "Unit": material.unit,
      "Cost Per Unit (ZMW)": material.cost_per_unit,
      "Threshold": material.threshold,
      "Status": material.quantity < material.threshold ? "Low Stock" : "In Stock",
      "Total Value (ZMW)": (material.quantity * material.cost_per_unit).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materials");
    XLSX.writeFile(wb, `NetGenix_Materials_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Materials exported to Excel successfully!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Material Stock</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Material
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? "Edit Material" : "Add New Material"}
                </DialogTitle>
                <DialogDescription>
                  Track your printing and embroidery materials
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Material Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Cotton Thread, Vinyl"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      placeholder="e.g., kg, m, pcs"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="threshold">Low Stock Alert Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.01"
                    value={formData.threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, threshold: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost_per_unit">Cost Per Unit (ZMW)</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_per_unit: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingMaterial ? "Update Material" : "Add Material"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Cost/Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material.id} className={isLowStock(material) ? "bg-warning/5" : ""}>
                <TableCell className="font-medium">{material.name}</TableCell>
                <TableCell>
                  {material.quantity} {material.unit}
                </TableCell>
                <TableCell>
                  {material.threshold} {material.unit}
                </TableCell>
                <TableCell>ZMW {material.cost_per_unit.toFixed(2)}</TableCell>
                <TableCell>
                  {isLowStock(material) ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="outline">In Stock</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(material)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
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
