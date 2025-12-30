-- Drop existing user update policy
DROP POLICY IF EXISTS "Users can update own replies" ON public.support_ticket_replies;

-- Recreate with relaxed WITH CHECK for soft delete compatibility
-- USING: restricts which rows can be selected for update (ownership + user type)
-- WITH CHECK: only validates ownership after update (allows is_deleted, deleted_at changes)
CREATE POLICY "Users can update own replies"
ON public.support_ticket_replies
FOR UPDATE
TO public
USING (auth.uid() = user_id AND sender_type = 'user')
WITH CHECK (auth.uid() = user_id);