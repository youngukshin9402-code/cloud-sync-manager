-- Add SELECT policy for users to view replies on their own tickets
CREATE POLICY "Users can view replies on own tickets"
ON public.support_ticket_replies
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_ticket_replies.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
  AND is_deleted = false
);