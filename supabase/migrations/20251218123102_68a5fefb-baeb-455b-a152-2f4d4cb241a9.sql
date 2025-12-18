-- ============================================
-- Beta Launch P0: Server Sync Tables
-- ============================================

-- 1. Water Logs
CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Water Settings
CREATE TABLE public.water_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_goal INTEGER NOT NULL DEFAULT 2000,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_start TIME DEFAULT '08:00',
  reminder_end TIME DEFAULT '22:00',
  reminder_interval INTEGER DEFAULT 90,
  evening_reminder BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Weight Records
CREATE TABLE public.weight_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Weight Goals
CREATE TABLE public.weight_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  target_weight DECIMAL(5,2) NOT NULL,
  target_date DATE NOT NULL,
  start_weight DECIMAL(5,2) NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. InBody Records
CREATE TABLE public.inbody_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  skeletal_muscle DECIMAL(5,2),
  body_fat DECIMAL(5,2),
  body_fat_percent DECIMAL(5,2),
  bmr INTEGER,
  visceral_fat INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Health Checkup Records (Manual Input)
CREATE TABLE public.health_checkup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  blood_sugar INTEGER,
  hba1c DECIMAL(4,2),
  cholesterol INTEGER,
  triglyceride INTEGER,
  ast INTEGER,
  alt INTEGER,
  creatinine DECIMAL(4,2),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Meal Records
CREATE TABLE public.meal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  image_url TEXT,
  foods JSONB NOT NULL DEFAULT '[]',
  total_calories INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Gym Records
CREATE TABLE public.gym_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Orders (Beta status flow)
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'cancel_requested', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  status public.order_status DEFAULT 'pending',
  payment_method TEXT,
  is_beta BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Consents (Terms agreement)
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  terms_agreed BOOLEAN NOT NULL DEFAULT false,
  privacy_agreed BOOLEAN NOT NULL DEFAULT false,
  health_info_agreed BOOLEAN NOT NULL DEFAULT false,
  marketing_agreed BOOLEAN DEFAULT false,
  agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notification Settings
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  meal_reminder BOOLEAN DEFAULT true,
  water_reminder BOOLEAN DEFAULT true,
  exercise_reminder BOOLEAN DEFAULT true,
  coaching_reminder BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Reminders (Scheduled notifications data)
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('water', 'meal', 'exercise')),
  scheduled_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checkup_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Users can manage their own data
-- ============================================

-- Water Logs
CREATE POLICY "Users can manage own water logs" ON public.water_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view assigned user water logs" ON public.water_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'coach') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM guardian_connections WHERE guardian_id = auth.uid() AND user_id = water_logs.user_id)
  );

-- Water Settings
CREATE POLICY "Users can manage own water settings" ON public.water_settings
  FOR ALL USING (auth.uid() = user_id);

-- Weight Records
CREATE POLICY "Users can manage own weight records" ON public.weight_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view assigned user weight records" ON public.weight_records
  FOR SELECT USING (
    has_role(auth.uid(), 'coach') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM guardian_connections WHERE guardian_id = auth.uid() AND user_id = weight_records.user_id)
  );

-- Weight Goals
CREATE POLICY "Users can manage own weight goals" ON public.weight_goals
  FOR ALL USING (auth.uid() = user_id);

-- InBody Records
CREATE POLICY "Users can manage own inbody records" ON public.inbody_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view assigned user inbody records" ON public.inbody_records
  FOR SELECT USING (
    has_role(auth.uid(), 'coach') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM guardian_connections WHERE guardian_id = auth.uid() AND user_id = inbody_records.user_id)
  );

-- Health Checkup Records
CREATE POLICY "Users can manage own health checkup records" ON public.health_checkup_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view assigned user health checkup records" ON public.health_checkup_records
  FOR SELECT USING (
    has_role(auth.uid(), 'coach') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM guardian_connections WHERE guardian_id = auth.uid() AND user_id = health_checkup_records.user_id)
  );

-- Meal Records
CREATE POLICY "Users can manage own meal records" ON public.meal_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view assigned user meal records" ON public.meal_records
  FOR SELECT USING (
    has_role(auth.uid(), 'coach') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM guardian_connections WHERE guardian_id = auth.uid() AND user_id = meal_records.user_id)
  );

-- Gym Records
CREATE POLICY "Users can manage own gym records" ON public.gym_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view assigned user gym records" ON public.gym_records
  FOR SELECT USING (
    has_role(auth.uid(), 'coach') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM guardian_connections WHERE guardian_id = auth.uid() AND user_id = gym_records.user_id)
  );

-- Orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User Consents
CREATE POLICY "Users can manage own consents" ON public.user_consents
  FOR ALL USING (auth.uid() = user_id);

-- Notification Settings
CREATE POLICY "Users can manage own notification settings" ON public.notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users can manage own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX idx_water_logs_user_date ON public.water_logs(user_id, date);
CREATE INDEX idx_weight_records_user_date ON public.weight_records(user_id, date);
CREATE INDEX idx_inbody_records_user_date ON public.inbody_records(user_id, date);
CREATE INDEX idx_health_checkup_records_user_date ON public.health_checkup_records(user_id, date);
CREATE INDEX idx_meal_records_user_date ON public.meal_records(user_id, date);
CREATE INDEX idx_gym_records_user_date ON public.gym_records(user_id, date);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);