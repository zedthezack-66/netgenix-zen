-- Create material type enum
CREATE TYPE public.material_type AS ENUM ('Vinyl', 'PVC Banner', 'Banner Material', 'DTF');

-- Create material_rolls table for tracking individual rolls
CREATE TABLE public.material_rolls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roll_id TEXT NOT NULL UNIQUE,
  material_type material_type NOT NULL,
  roll_width NUMERIC NOT NULL,
  initial_length NUMERIC NOT NULL,
  remaining_length NUMERIC NOT NULL,
  cost_per_sqm NUMERIC NOT NULL DEFAULT 0,
  selling_rate_per_sqm NUMERIC NOT NULL DEFAULT 0,
  alert_level NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.material_rolls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for material_rolls
CREATE POLICY "Authenticated users can view all material rolls"
ON public.material_rolls FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create material rolls"
ON public.material_rolls FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update material rolls"
ON public.material_rolls FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete material rolls"
ON public.material_rolls FOR DELETE
USING (true);

-- Add material tracking fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN material_roll_id UUID REFERENCES public.material_rolls(id),
ADD COLUMN job_width NUMERIC,
ADD COLUMN job_height NUMERIC,
ADD COLUMN job_quantity INTEGER DEFAULT 1,
ADD COLUMN sqm_used NUMERIC,
ADD COLUMN length_deducted NUMERIC,
ADD COLUMN rate_per_sqm NUMERIC,
ADD COLUMN payment_received NUMERIC DEFAULT 0,
ADD COLUMN received_by TEXT,
ADD COLUMN payment_mode TEXT;

-- Create trigger for updated_at on material_rolls
CREATE TRIGGER update_material_rolls_updated_at
BEFORE UPDATE ON public.material_rolls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();