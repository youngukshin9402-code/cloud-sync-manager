-- Allow admins/coaches to update (including soft-delete) any support ticket reply
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update any reply' AND tablename = 'support_ticket_replies'
  ) THEN
    CREATE POLICY "Admins can update any reply"
    ON public.support_ticket_replies
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'));
  END IF;
END $$;