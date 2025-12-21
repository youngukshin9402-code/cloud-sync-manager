-- Create chat messages table for 1:1 messaging between users and coaches
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can send messages to their assigned coach
CREATE POLICY "Users can send messages to assigned coach"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    -- User sending to their assigned coach
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.assigned_coach_id = receiver_id
    )
    OR
    -- Coach sending to their assigned user
    (has_role(auth.uid(), 'coach') AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = receiver_id AND profiles.assigned_coach_id = auth.uid()
    ))
    OR
    -- Admin can send to anyone
    has_role(auth.uid(), 'admin')
  )
);

-- Users can view their own messages (sent or received)
CREATE POLICY "Users can view own messages"
ON public.chat_messages
FOR SELECT
USING (
  auth.uid() = sender_id 
  OR auth.uid() = receiver_id
  OR has_role(auth.uid(), 'admin')
);

-- Users can update read status of received messages
CREATE POLICY "Users can update read status"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = receiver_id OR has_role(auth.uid(), 'admin'));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;