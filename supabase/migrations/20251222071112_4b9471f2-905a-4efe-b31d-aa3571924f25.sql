-- 1. 즐겨찾기 음식 테이블
CREATE TABLE public.favorite_foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  portion TEXT DEFAULT '1인분',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorite foods" ON public.favorite_foods FOR ALL USING (auth.uid() = user_id);

-- 2. 식사 세트 테이블 (아침 루틴 등)
CREATE TABLE public.meal_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'breakfast',
  foods JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meal sets" ON public.meal_sets FOR ALL USING (auth.uid() = user_id);

-- 3. 주간 리포트 테이블
CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  avg_calories INTEGER DEFAULT 0,
  avg_protein INTEGER DEFAULT 0,
  avg_carbs INTEGER DEFAULT 0,
  avg_fat INTEGER DEFAULT 0,
  calorie_goal_rate INTEGER DEFAULT 0,
  protein_goal_rate INTEGER DEFAULT 0,
  top_foods JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly reports" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert weekly reports" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 코치 체크인 템플릿 테이블
CREATE TABLE public.checkin_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  condition_score INTEGER DEFAULT 3,
  sleep_hours NUMERIC DEFAULT 7,
  exercise_done BOOLEAN DEFAULT false,
  meal_count INTEGER DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checkin_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checkins" ON public.checkin_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view assigned user checkins" ON public.checkin_templates FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'coach'::app_role) AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = checkin_templates.user_id AND profiles.assigned_coach_id = auth.uid()
  ))
);