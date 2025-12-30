-- Enable realtime payloads for support tickets/replies
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_ticket_replies REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add support_tickets to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;

  -- support_ticket_replies might already be present
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_replies;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;