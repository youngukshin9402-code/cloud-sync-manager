-- Drop existing policy and recreate with ward -> guardian visibility
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (
    (auth.uid() = id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    (has_role(auth.uid(), 'coach'::app_role) AND (assigned_coach_id = auth.uid())) OR 
    -- Guardian can view ward's profile (existing)
    (EXISTS (
      SELECT 1 FROM guardian_connections
      WHERE guardian_connections.guardian_id = auth.uid() 
        AND guardian_connections.user_id = profiles.id
    )) OR
    -- Ward can view guardian's profile (new - for nickname display)
    (EXISTS (
      SELECT 1 FROM guardian_connections
      WHERE guardian_connections.user_id = auth.uid() 
        AND guardian_connections.guardian_id = profiles.id
    ))
  );