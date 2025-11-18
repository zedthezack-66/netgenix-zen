import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/Dashboard";
import { JobsManager } from "@/components/JobsManager";
import { ExpensesManager } from "@/components/ExpensesManager";
import { MaterialsManager } from "@/components/MaterialsManager";
import { Reports } from "@/components/Reports";
import { PerformanceCharts } from "@/components/PerformanceCharts";
import { ReportHistory } from "@/components/ReportHistory";
import { Settings } from "@/components/Settings";
import { LogOut, Printer, LayoutDashboard, Briefcase, DollarSign, Package, FileText, Archive, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Mesh Background */}
      <div className="absolute inset-0 bg-[var(--gradient-mesh)] opacity-60 pointer-events-none" />
      
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm relative">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center shadow-md">
                <Printer className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">NetGenix</h1>
                <p className="text-sm text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-4 w-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Archive className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
            <PerformanceCharts />
          </TabsContent>

          <TabsContent value="jobs">
            <JobsManager />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesManager />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsManager />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          <TabsContent value="history">
            <ReportHistory />
          </TabsContent>

          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-md py-4 mt-12 relative">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            System Powered by <span className="font-semibold text-primary">ZEDZACK TECH</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
