import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Percent, Package, Save, Database, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Settings = () => {
  const [businessName, setBusinessName] = useState("NetGenix");
  const [vatRate, setVatRate] = useState("16");
  const [stockThreshold, setStockThreshold] = useState("10");
  const [tpin, setTpin] = useState("");
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const handleSave = () => {
    setSaving(true);
    
    // Simulate save to localStorage
    localStorage.setItem("netgenix_settings", JSON.stringify({
      businessName,
      vatRate: parseFloat(vatRate),
      stockThreshold: parseFloat(stockThreshold),
      tpin,
    }));

    setTimeout(() => {
      setSaving(false);
      toast.success("⚙️ Settings Saved!", {
        description: "Your preferences have been updated successfully",
      });
    }, 500);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-backup');
      
      if (error) throw error;

      // Convert backup to downloadable JSON file
      const backupBlob = new Blob([JSON.stringify(data.backup, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(backupBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `netgenix-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("💾 Backup Created!", {
        description: "Database backup downloaded successfully",
      });
    } catch (error) {
      console.error('Backup error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create database backup";
      toast.error("Backup Failed", {
        description: errorMessage,
      });
    } finally {
      setBackingUp(false);
    }
  };

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("netgenix_settings");
    if (saved) {
      const settings = JSON.parse(saved);
      setBusinessName(settings.businessName || "NetGenix");
      setVatRate(settings.vatRate?.toString() || "16");
      setStockThreshold(settings.stockThreshold?.toString() || "10");
      setTpin(settings.tpin || "");
    }
  }, []);

  return (
    <div className="space-y-6 animate-slideUp">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your business preferences and configuration</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Your company information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter business name"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle>Tax Configuration</CardTitle>
                <CardDescription>VAT and tax settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                placeholder="Enter VAT rate"
              />
              <p className="text-xs text-muted-foreground">
                Current: {vatRate}% (inclusive in job prices)
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="tpin">Tax Registration Number (TPIN)</Label>
              <Input
                id="tpin"
                value={tpin}
                onChange={(e) => setTpin(e.target.value)}
                placeholder="Enter TPIN"
              />
              <p className="text-xs text-muted-foreground">
                This will appear on all VAT reports
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle>Stock Management</CardTitle>
                <CardDescription>Inventory thresholds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockThreshold">Default Low Stock Threshold</Label>
              <Input
                id="stockThreshold"
                type="number"
                min="0"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
                placeholder="Enter threshold"
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this level
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Database Backup</CardTitle>
                <CardDescription>Create and download database backups</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Automated weekly backups run every Friday at 23:00. You can also create manual backups anytime.
              </p>
              <Button 
                onClick={handleBackup} 
                disabled={backingUp}
                className="w-full"
                variant="secondary"
              >
                {backingUp ? (
                  <>Creating Backup...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Create Backup Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-muted hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Application details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Powered By</span>
              <span className="text-sm font-semibold text-primary">ZEDZACK TECH</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Currency</span>
              <span className="text-sm font-medium">ZMW</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>Legal & Compliance</CardTitle>
            <CardDescription>Terms and conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Terms & Conditions</h3>
              <p className="text-sm text-muted-foreground">
                By using this system, you agree to maintain accurate records, comply with local tax regulations, 
                and ensure all financial data is kept confidential and secure. The system is provided for business 
                management purposes only.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Legal Agreements</h3>
              <p className="text-sm text-muted-foreground">
                This software is licensed to the registered business entity. Unauthorized reproduction, distribution, 
                or modification is prohibited. All generated reports must comply with Zambian Revenue Authority (ZRA) 
                requirements for tax reporting and record keeping.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Data Protection</h3>
              <p className="text-sm text-muted-foreground">
                All business and financial data is stored securely. You are responsible for maintaining backup copies 
                and ensuring compliance with applicable data protection regulations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};
