-- Add payment_at timestamp to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS payment_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;