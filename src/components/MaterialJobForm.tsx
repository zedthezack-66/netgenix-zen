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
import { toast } from "sonner";
import { Plus, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MATERIAL_TYPES = ["Vinyl", "PVC Banner", "Banner Material", "DTF"] as const;
const PAYMENT_MODES = ["Cash", "Mobile Money", "Credit"] as const;

interface MaterialRoll {
  id: string;
  roll_id: string;
  material_type: string;
  roll_width: number;
  remaining_length: number;
  selling_rate_per_sqm: number;
  cost_per_sqm: number;
}

interface MaterialJobFormProps {
  onJobCreated: () => void;
}

export const MaterialJobForm = ({ onJobCreated }: MaterialJobFormProps) => {
  const [open, setOpen] = useState(false);
  const [rolls, setRolls] = useState<MaterialRoll[]>([]);
  const [filteredRolls, setFilteredRolls] = useState<MaterialRoll[]>([]);
  const [formData, setFormData] = useState({
    client_name: "",
    material_type: "",
    roll_id: "",
    job_width: "",
    job_height: "",
    job_quantity: "1",
    rate_per_sqm: "",
    payment_received: "",
    received_by: "",
    payment_mode: "",
    job_type: "",
    completion_date: "",
  });

  const [calculations, setCalculations] = useState({
    sqm_used: 0,
    amount_due: 0,
    length_deducted: 0,
    cost_consumed: 0,
  });

  useEffect(() => {
    fetchRolls();
  }, []);

  useEffect(() => {
    if (formData.material_type) {
      const filtered = rolls.filter(r => r.material_type === formData.material_type);
      setFilteredRolls(filtered);
    } else {
      setFilteredRolls([]);
    }
  }, [formData.material_type, rolls]);

  useEffect(() => {
    // Auto-calculate when dimensions change
    const width = parseFloat(formData.job_width) || 0;
    const height = parseFloat(formData.job_height) || 0;
    const quantity = parseInt(formData.job_quantity) || 1;
    const rate = parseFloat(formData.rate_per_sqm) || 0;

    const selectedRoll = rolls.find(r => r.id === formData.roll_id);
    const rollWidth = selectedRoll?.roll_width || 1;
    const costPerSqm = selectedRoll?.cost_per_sqm || 0;

    const sqm = width * height * quantity;
    const amount = sqm * rate;
    const lengthUsed = sqm / rollWidth;
    const costConsumed = sqm * costPerSqm;

    setCalculations({
      sqm_used: sqm,
      amount_due: amount,
      length_deducted: lengthUsed,
      cost_consumed: costConsumed,
    });
  }, [formData.job_width, formData.job_height, formData.job_quantity, formData.rate_per_sqm, formData.roll_id, rolls]);

  const fetchRolls = async () => {
    try {
      const { data, error } = await supabase
        .from("material_rolls")
        .select("id, roll_id, material_type, roll_width, remaining_length, selling_rate_per_sqm, cost_per_sqm")
        .gt("remaining_length", 0);

      if (error) throw error;
      setRolls((data as MaterialRoll[]) || []);
    } catch (error: any) {
      console.error("Failed to fetch rolls:", error);
    }
  };

  const handleRollSelect = (rollId: string) => {
    const roll = rolls.find(r => r.id === rollId);
    if (roll) {
      setFormData({
        ...formData,
        roll_id: rollId,
        rate_per_sqm: roll.selling_rate_per_sqm.toString(),
        job_type: `${roll.material_type} Print`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedRoll = rolls.find(r => r.id === formData.roll_id);
    if (!selectedRoll) {
      toast.error("Please select a roll");
      return;
    }

    // Check if roll has enough material
    if (calculations.length_deducted > selectedRoll.remaining_length) {
      toast.error("Insufficient material on roll", {
        description: `Required: ${calculations.length_deducted.toFixed(2)}m, Available: ${selectedRoll.remaining_length.toFixed(2)}m`,
      });
      return;
    }

    // Check if payment is recorded to determine status
    const paymentAmount = parseFloat(formData.payment_received) || 0;
    const hasPayment = paymentAmount > 0 && formData.payment_mode && formData.received_by;
    const jobStatus = hasPayment ? "completed" : "in_progress";

    try {
      // Create the job - material deduction happens immediately
      const { error: jobError } = await supabase.from("jobs").insert({
        client_name: formData.client_name,
        job_type: formData.job_type || `${selectedRoll.material_type} Print`,
        cost: calculations.amount_due,
        status: jobStatus,
        completion_date: hasPayment ? (formData.completion_date || new Date().toISOString().split("T")[0]) : null,
        created_by: user.id,
        material_roll_id: formData.roll_id,
        job_width: parseFloat(formData.job_width),
        job_height: parseFloat(formData.job_height),
        job_quantity: parseInt(formData.job_quantity),
        sqm_used: calculations.sqm_used,
        length_deducted: calculations.length_deducted,
        rate_per_sqm: parseFloat(formData.rate_per_sqm),
        payment_received: paymentAmount,
        received_by: formData.received_by || null,
        payment_mode: formData.payment_mode || null,
        payment_at: hasPayment ? new Date().toISOString() : null,
        materials_used: `${selectedRoll.roll_id} - ${calculations.sqm_used.toFixed(2)} sqm`,
      });

      if (jobError) throw jobError;

      // Deduct from roll
      const newLength = selectedRoll.remaining_length - calculations.length_deducted;
      const { error: rollError } = await supabase
        .from("material_rolls")
        .update({ remaining_length: newLength })
        .eq("id", formData.roll_id);

      if (rollError) throw rollError;

      toast.success(hasPayment ? "✅ Material job completed!" : "🔄 Material job created (In Progress)", {
        description: `${calculations.sqm_used.toFixed(2)} SQM used, ZMW ${calculations.amount_due.toFixed(2)} billed${!hasPayment ? " - Add payment to complete" : ""}`,
      });

      setOpen(false);
      resetForm();
      onJobCreated();
      fetchRolls();
    } catch (error: any) {
      toast.error("Failed to create job", {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: "",
      material_type: "",
      roll_id: "",
      job_width: "",
      job_height: "",
      job_quantity: "1",
      rate_per_sqm: "",
      payment_received: "",
      received_by: "",
      payment_mode: "",
      job_type: "",
      completion_date: "",
    });
    setCalculations({ sqm_used: 0, amount_due: 0, length_deducted: 0, cost_consumed: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-primary/10 border-primary/30 hover:bg-primary/20">
          <Calculator className="mr-2 h-4 w-4" />
          Material Job (SQM)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Material Job</DialogTitle>
          <DialogDescription>
            Auto-calculate SQM and deduct from roll inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Material Type</Label>
              <Select
                value={formData.material_type}
                onValueChange={(value) => setFormData({ ...formData, material_type: value, roll_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Roll</Label>
              <Select
                value={formData.roll_id}
                onValueChange={handleRollSelect}
                disabled={!formData.material_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select roll" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRolls.map((roll) => (
                    <SelectItem key={roll.id} value={roll.id}>
                      {roll.roll_id} ({roll.remaining_length.toFixed(1)}m left)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="job_width">Width (m)</Label>
              <Input
                id="job_width"
                type="number"
                step="0.01"
                value={formData.job_width}
                onChange={(e) => setFormData({ ...formData, job_width: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="job_height">Height (m)</Label>
              <Input
                id="job_height"
                type="number"
                step="0.01"
                value={formData.job_height}
                onChange={(e) => setFormData({ ...formData, job_height: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="job_quantity">Qty</Label>
              <Input
                id="job_quantity"
                type="number"
                min="1"
                value={formData.job_quantity}
                onChange={(e) => setFormData({ ...formData, job_quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rate_per_sqm">Rate per SQM (ZMW)</Label>
            <Input
              id="rate_per_sqm"
              type="number"
              step="0.01"
              value={formData.rate_per_sqm}
              onChange={(e) => setFormData({ ...formData, rate_per_sqm: e.target.value })}
              required
            />
          </div>

          {/* Auto Calculations Display */}
          {calculations.sqm_used > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SQM Used:</span>
                  <span className="font-semibold">{calculations.sqm_used.toFixed(2)} sqm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Length to Deduct:</span>
                  <span className="font-semibold">{calculations.length_deducted.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Cost:</span>
                  <span className="font-semibold">ZMW {calculations.cost_consumed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Amount Due:</span>
                  <span className="font-bold text-primary">ZMW {calculations.amount_due.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_received">Payment Received (ZMW)</Label>
              <Input
                id="payment_received"
                type="number"
                step="0.01"
                value={formData.payment_received}
                onChange={(e) => setFormData({ ...formData, payment_received: e.target.value })}
                placeholder={calculations.amount_due.toFixed(2)}
              />
            </div>
            <div>
              <Label htmlFor="payment_mode">Payment Mode</Label>
              <Select
                value={formData.payment_mode}
                onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="received_by">Received By</Label>
            <Input
              id="received_by"
              value={formData.received_by}
              onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="completion_date">Completion Date</Label>
            <Input
              id="completion_date"
              type="date"
              value={formData.completion_date}
              onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full">
            Create Material Job
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
