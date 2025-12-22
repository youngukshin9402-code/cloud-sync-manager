-- nutrition_settings 테이블 생성 (사용자별 목표 칼로리/매크로 설정)
CREATE TABLE public.nutrition_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age integer,
  height_cm integer,
  current_weight numeric,
  goal_weight numeric,
  calorie_goal integer,
  carb_goal_g integer,
  protein_goal_g integer,
  fat_goal_g integer,
  updated_at timestamptz DEFAULT now()
);

-- nutrition_settings RLS 활성화
ALTER TABLE public.nutrition_settings ENABLE ROW LEVEL SECURITY;

-- nutrition_settings RLS 정책
CREATE POLICY "Users can view own nutrition settings"
ON public.nutrition_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition settings"
ON public.nutrition_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition settings"
ON public.nutrition_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition settings"
ON public.nutrition_settings FOR DELETE
USING (auth.uid() = user_id);

-- custom_foods 테이블 생성 (사용자 커스텀 음식)
CREATE TABLE public.custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  calories integer NOT NULL,
  carbs numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- custom_foods RLS 활성화
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

-- custom_foods RLS 정책
CREATE POLICY "Users can view own custom foods"
ON public.custom_foods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom foods"
ON public.custom_foods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom foods"
ON public.custom_foods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom foods"
ON public.custom_foods FOR DELETE
USING (auth.uid() = user_id);

-- custom_foods 인덱스 (검색 성능 향상)
CREATE INDEX idx_custom_foods_user_id ON public.custom_foods(user_id);
CREATE INDEX idx_custom_foods_name ON public.custom_foods(name);