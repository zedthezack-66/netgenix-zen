-- Expand allowed values for report_type in reports table
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check
  CHECK (report_type IN ('daily', 'weekly', 'monthly', 'monthly_vat'));
