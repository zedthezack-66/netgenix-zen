-- Add DELETE policy for reports table so users can delete reports
CREATE POLICY "Authenticated users can delete reports" 
ON public.reports 
FOR DELETE 
USING (true);

-- Add UPDATE policy for reports table for future functionality
CREATE POLICY "Authenticated users can update reports" 
ON public.reports 
FOR UPDATE 
USING (true);