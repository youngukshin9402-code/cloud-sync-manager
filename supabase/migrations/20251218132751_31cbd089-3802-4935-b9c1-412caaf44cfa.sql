-- Update order_status enum for production launch
-- Add new statuses: requested, coaching_started, refunded

-- First, create a new enum with all values
CREATE TYPE public.order_status_new AS ENUM (
  'requested',
  'pending', 
  'paid',
  'coaching_started',
  'cancel_requested',
  'cancelled',
  'refunded'
);

-- Update the orders table to use the new enum
ALTER TABLE public.orders 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.orders 
  ALTER COLUMN status TYPE public.order_status_new 
  USING status::text::public.order_status_new;

ALTER TABLE public.orders 
  ALTER COLUMN status SET DEFAULT 'requested'::public.order_status_new;

-- Drop old enum and rename new one
DROP TYPE public.order_status;
ALTER TYPE public.order_status_new RENAME TO order_status;

-- Create support_tickets table for customer support
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_ticket_replies table
CREATE TABLE public.support_ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coaching_feedback table for async coaching
CREATE TABLE public.coaching_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID REFERENCES public.coaching_sessions(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('text', 'voice')),
  content TEXT,
  audio_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice_files storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-files', 'voice-files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_feedback ENABLE ROW LEVEL SECURITY;

-- Support tickets policies
CREATE POLICY "Users can create own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Support ticket replies policies
CREATE POLICY "Users can view replies on own tickets" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users can create replies on own tickets" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Coaching feedback policies
CREATE POLICY "Coaches can create feedback" ON public.coaching_feedback
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Users can view own feedback" ON public.coaching_feedback
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = coach_id OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can update read status" ON public.coaching_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Voice files storage policies
CREATE POLICY "Coaches can upload voice files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-files' AND 
    (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users can view own voice files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Coaches can view their voice files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-files' AND
    (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Add trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();