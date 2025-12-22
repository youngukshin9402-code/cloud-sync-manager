-- Create checkin_reports table for structured check-in data
CREATE TABLE IF NOT EXISTS public.checkin_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkin_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "Users can create own reports"
ON public.checkin_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.checkin_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Coaches can view reports of assigned users
CREATE POLICY "Coaches can view assigned user reports"
ON public.checkin_reports
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = checkin_reports.user_id 
    AND profiles.assigned_coach_id = auth.uid()
  )
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.checkin_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_checkin_reports_user_date ON public.checkin_reports(user_id, report_date);
CREATE INDEX idx_checkin_reports_coach ON public.checkin_reports(coach_id);