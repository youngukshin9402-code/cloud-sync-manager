-- Allow admins to view guardian connection status (read-only)
CREATE POLICY "Admins can view all guardian connections"
ON public.guardian_connections
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow either side (guardian or ward/user) to unlink
CREATE POLICY "Users can delete their guardian connections"
ON public.guardian_connections
FOR DELETE
USING (
  auth.uid() = user_id
  OR auth.uid() = guardian_id
);

-- Allow admins to view users' body/profile-edit settings
CREATE POLICY "Admins can view all nutrition settings"
ON public.nutrition_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
