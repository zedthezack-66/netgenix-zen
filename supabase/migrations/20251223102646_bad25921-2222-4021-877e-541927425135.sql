-- Add price_per_item column to jobs table
ALTER TABLE public.jobs
ADD COLUMN price_per_item numeric DEFAULT NULL;

-- Add admin_password column for protected actions (stored as hash)
ALTER TABLE public.profiles
ADD COLUMN admin_password_hash text DEFAULT NULL;