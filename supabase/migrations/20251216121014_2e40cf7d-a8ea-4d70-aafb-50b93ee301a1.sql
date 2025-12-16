-- Add status column to material_rolls table
ALTER TABLE public.material_rolls 
ADD COLUMN status text NOT NULL DEFAULT 'Active';

-- Add check constraint for valid status values
ALTER TABLE public.material_rolls 
ADD CONSTRAINT material_rolls_status_check 
CHECK (status IN ('Active', 'Completed'));