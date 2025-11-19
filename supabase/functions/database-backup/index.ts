import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting database backup...');

    // Fetch all data from all tables
    const [profilesRes, jobsRes, expensesRes, materialsRes, reportsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('jobs').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('materials').select('*'),
      supabase.from('reports').select('*'),
    ]);

    // Check for errors
    if (profilesRes.error) throw profilesRes.error;
    if (jobsRes.error) throw jobsRes.error;
    if (expensesRes.error) throw expensesRes.error;
    if (materialsRes.error) throw materialsRes.error;
    if (reportsRes.error) throw reportsRes.error;

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {
        profiles: profilesRes.data,
        jobs: jobsRes.data,
        expenses: expensesRes.data,
        materials: materialsRes.data,
        reports: reportsRes.data,
      },
      metadata: {
        totalRecords: {
          profiles: profilesRes.data?.length || 0,
          jobs: jobsRes.data?.length || 0,
          expenses: expensesRes.data?.length || 0,
          materials: materialsRes.data?.length || 0,
          reports: reportsRes.data?.length || 0,
        }
      }
    };

    console.log('Backup completed:', backup.metadata.totalRecords);

    return new Response(
      JSON.stringify({
        success: true,
        backup,
        message: 'Database backup created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});