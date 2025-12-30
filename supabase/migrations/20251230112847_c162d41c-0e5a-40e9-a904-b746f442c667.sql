-- Drop the existing restrictive policy that blocks soft-delete
DROP POLICY IF EXISTS "Users can update own replies" ON public.support_ticket_replies;

-- Recreate the policy that allows users to update (including soft-delete) their own replies
-- USING: the row must belong to the user and be a user-type message (we allow both deleted and non-deleted rows to be updated)
-- WITH CHECK: after update, the row must still belong to the user and be a user-type message
CREATE POLICY "Users can update own replies"
ON public.support_ticket_replies
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND sender_type = 'user')
WITH CHECK (auth.uid() = user_id AND sender_type = 'user');