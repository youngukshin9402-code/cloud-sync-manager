-- Create storage bucket for health checkup images
INSERT INTO storage.buckets (id, name, public)
VALUES ('health-checkups', 'health-checkups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for health-checkups bucket
CREATE POLICY "Users can upload own health checkup images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'health-checkups' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own health checkup images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'health-checkups' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'coach')
    OR has_role(auth.uid(), 'admin')
  )
);

-- Enable realtime for health_records
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_records;