CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'coach',
    'guardian',
    'user'
);


--
-- Name: coaching_session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.coaching_session_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: daily_log_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.daily_log_type AS ENUM (
    'food',
    'mission'
);


--
-- Name: health_record_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.health_record_status AS ENUM (
    'uploading',
    'analyzing',
    'pending_review',
    'completed',
    'rejected'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'requested',
    'pending',
    'paid',
    'coaching_started',
    'cancel_requested',
    'cancelled',
    'refunded'
);


--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_tier AS ENUM (
    'basic',
    'premium'
);


--
-- Name: user_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_type AS ENUM (
    'user',
    'guardian',
    'coach',
    'admin'
);


--
-- Name: connect_guardian_with_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.connect_guardian_with_code(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_connection_id uuid;
  v_user_id uuid;
  v_guardian_id uuid := auth.uid();
BEGIN
  -- 유효한 코드 찾기
  SELECT id, user_id INTO v_connection_id, v_user_id
  FROM guardian_connections
  WHERE connection_code = p_code
    AND code_expires_at > now()
    AND (guardian_id IS NULL OR guardian_id = user_id);  -- pending 상태
  
  IF v_connection_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  
  -- 자기 자신 연결 방지
  IF v_user_id = v_guardian_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_connection');
  END IF;
  
  -- 연결 업데이트
  UPDATE guardian_connections
  SET guardian_id = v_guardian_id,
      connection_code = NULL,
      code_expires_at = NULL,
      connected_at = now()
  WHERE id = v_connection_id;
  
  RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id);
END;
$$;


--
-- Name: connect_guardian_with_phone_verification(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.connect_guardian_with_phone_verification(p_target_user_phone text, p_verification_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_target_user_id uuid;
  v_guardian_id uuid := auth.uid();
  v_connection_id uuid;
  v_existing_connection uuid;
BEGIN
  -- 1. 인증 코드 확인
  SELECT user_id INTO v_target_user_id
  FROM phone_verification_codes
  WHERE phone = p_target_user_phone
    AND code = p_verification_code
    AND purpose = 'guardian_connection'
    AND expires_at > now()
    AND verified = false;
  
  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  
  -- 2. 자기 자신 연결 방지
  IF v_target_user_id = v_guardian_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_connection');
  END IF;
  
  -- 3. 이미 연결된 경우 확인
  SELECT id INTO v_existing_connection
  FROM guardian_connections
  WHERE user_id = v_target_user_id AND guardian_id = v_guardian_id;
  
  IF v_existing_connection IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_connected');
  END IF;
  
  -- 4. 인증 코드를 사용됨으로 표시
  UPDATE phone_verification_codes
  SET verified = true
  WHERE phone = p_target_user_phone
    AND code = p_verification_code
    AND purpose = 'guardian_connection';
  
  -- 5. 연결 생성
  INSERT INTO guardian_connections (user_id, guardian_id, connected_at)
  VALUES (v_target_user_id, v_guardian_id, now())
  RETURNING id INTO v_connection_id;
  
  RETURN jsonb_build_object('success', true, 'connection_id', v_connection_id);
END;
$$;


--
-- Name: generate_phone_verification_code(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_phone_verification_code(p_phone text, p_purpose text DEFAULT 'guardian_connection'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
BEGIN
  -- 6자리 랜덤 코드 생성
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- 기존 미사용 코드 삭제
  DELETE FROM phone_verification_codes
  WHERE user_id = v_user_id AND purpose = p_purpose AND verified = false;
  
  -- 새 코드 생성 (5분 유효)
  INSERT INTO phone_verification_codes (user_id, phone, code, purpose, expires_at)
  VALUES (v_user_id, p_phone, v_code, p_purpose, now() + interval '5 minutes');
  
  RETURN jsonb_build_object('success', true, 'code', v_code, 'expires_in_minutes', 5);
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', '사용자'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'user')
  );
  
  -- 기본 역할 부여
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'user_type')::public.app_role, 'user'));
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: prevent_sensitive_profile_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_sensitive_profile_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- admin은 모든 변경 허용
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- 일반 사용자는 민감 컬럼 변경 시 예외 발생
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    RAISE EXCEPTION 'user_type 변경 권한이 없습니다';
  END IF;
  
  IF OLD.assigned_coach_id IS DISTINCT FROM NEW.assigned_coach_id THEN
    RAISE EXCEPTION 'assigned_coach_id 변경 권한이 없습니다';
  END IF;
  
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    RAISE EXCEPTION 'subscription_tier 변경 권한이 없습니다';
  END IF;
  
  IF OLD.current_points IS DISTINCT FROM NEW.current_points THEN
    RAISE EXCEPTION 'current_points 변경 권한이 없습니다';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    target_table text NOT NULL,
    target_id uuid NOT NULL,
    before_value jsonb,
    after_value jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_health_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_health_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source_type text DEFAULT 'health_checkup'::text NOT NULL,
    source_record_id uuid,
    input_snapshot jsonb,
    ai_result jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_health_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_health_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    review_note text,
    overrides jsonb,
    review_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.ai_health_reviews REPLICA IDENTITY FULL;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    image_url text
);

ALTER TABLE ONLY public.chat_messages REPLICA IDENTITY FULL;


--
-- Name: checkin_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkin_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    version_number integer DEFAULT 1 NOT NULL,
    snapshot_data jsonb DEFAULT '{}'::jsonb,
    admin_id uuid
);


--
-- Name: checkin_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkin_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    condition_score integer DEFAULT 3,
    sleep_hours numeric DEFAULT 7,
    exercise_done boolean DEFAULT false,
    meal_count integer DEFAULT 3,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coach_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    available_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_booked boolean DEFAULT false
);


--
-- Name: coach_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    health_checkup_upload boolean DEFAULT true,
    inbody_upload boolean DEFAULT true,
    chat_message boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coaching_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaching_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    feedback_type text NOT NULL,
    content text,
    audio_url text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coaching_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['text'::text, 'voice'::text])))
);


--
-- Name: coaching_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaching_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    session_time time without time zone NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coaching_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaching_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    user_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    status public.coaching_session_status DEFAULT 'scheduled'::public.coaching_session_status,
    video_room_id text,
    coach_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: consultation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    goal text,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid
);


--
-- Name: custom_foods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_foods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    calories integer NOT NULL,
    carbs numeric DEFAULT 0 NOT NULL,
    protein numeric DEFAULT 0 NOT NULL,
    fat numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_goal_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_goal_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    achieved boolean DEFAULT false NOT NULL,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    log_date date DEFAULT CURRENT_DATE NOT NULL,
    log_type public.daily_log_type NOT NULL,
    content text NOT NULL,
    image_url text,
    ai_feedback text,
    is_completed boolean DEFAULT false,
    points_earned integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: favorite_foods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_foods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    calories integer DEFAULT 0 NOT NULL,
    carbs numeric DEFAULT 0 NOT NULL,
    protein numeric DEFAULT 0 NOT NULL,
    fat numeric DEFAULT 0 NOT NULL,
    portion text DEFAULT '1인분'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: guardian_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardian_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    guardian_id uuid,
    connection_code text,
    code_expires_at timestamp with time zone,
    connected_at timestamp with time zone DEFAULT now()
);


--
-- Name: gym_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gym_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    exercises jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    client_id text,
    images text[] DEFAULT '{}'::text[]
);


--
-- Name: health_age_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_age_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    actual_age integer NOT NULL,
    health_age integer NOT NULL,
    body_score integer,
    analysis text,
    inbody_data jsonb,
    inbody_record_date date,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: health_checkup_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_checkup_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    blood_sugar integer,
    hba1c numeric(4,2),
    cholesterol integer,
    triglyceride integer,
    ast integer,
    alt integer,
    creatinine numeric(4,2),
    systolic_bp integer,
    diastolic_bp integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    raw_image_urls text[] NOT NULL,
    parsed_data jsonb,
    health_tags text[],
    health_age integer,
    status public.health_record_status DEFAULT 'uploading'::public.health_record_status,
    coach_comment text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    exam_date date DEFAULT CURRENT_DATE
);


--
-- Name: inbody_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbody_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    weight numeric(5,2) NOT NULL,
    skeletal_muscle numeric(5,2),
    body_fat numeric(5,2),
    body_fat_percent numeric(5,2),
    bmr integer,
    visceral_fat integer,
    created_at timestamp with time zone DEFAULT now(),
    visceral_fat_area numeric
);


--
-- Name: meal_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    meal_type text NOT NULL,
    image_url text,
    foods jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_calories integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    client_id text,
    CONSTRAINT meal_records_meal_type_check CHECK ((meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])))
);


--
-- Name: meal_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    meal_type text DEFAULT 'breakfast'::text NOT NULL,
    foods jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_calories integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mission_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mission_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    coach_id uuid,
    content text NOT NULL,
    points integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    meal_reminder boolean DEFAULT true,
    water_reminder boolean DEFAULT true,
    exercise_reminder boolean DEFAULT true,
    coaching_reminder boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now(),
    default_reminder boolean DEFAULT true
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false NOT NULL,
    related_id uuid,
    related_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false
);


--
-- Name: nutrition_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_settings (
    user_id uuid NOT NULL,
    age integer,
    height_cm integer,
    current_weight numeric,
    goal_weight numeric,
    calorie_goal integer,
    carb_goal_g integer,
    protein_goal_g integer,
    fat_goal_g integer,
    updated_at timestamp with time zone DEFAULT now(),
    conditions text[],
    gender text,
    activity_level text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    product_type text NOT NULL,
    price integer NOT NULL,
    status public.order_status DEFAULT 'requested'::public.order_status,
    payment_method text,
    is_beta boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid,
    provider text DEFAULT 'toss'::text NOT NULL,
    order_id text NOT NULL,
    payment_key text,
    amount integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: phone_verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phone text NOT NULL,
    code text NOT NULL,
    purpose text DEFAULT 'guardian_connection'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: point_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    health_tags text[],
    image_url text,
    purchase_link text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nickname text,
    phone text,
    user_type public.user_type DEFAULT 'user'::public.user_type NOT NULL,
    subscription_tier public.subscription_tier DEFAULT 'basic'::public.subscription_tier,
    current_points integer DEFAULT 0,
    assigned_coach_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text DEFAULT 'web'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reminder_type text NOT NULL,
    scheduled_time time without time zone NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['water'::text, 'meal'::text, 'exercise'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    payer_id uuid NOT NULL,
    plan_type text NOT NULL,
    price integer NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    payment_method text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_ticket_message_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_message_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    previous_message text NOT NULL,
    edited_by uuid NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_ticket_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sender_type text DEFAULT 'admin'::text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.support_ticket_replies REPLICA IDENTITY FULL;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    additional_messages jsonb DEFAULT '[]'::jsonb,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);

ALTER TABLE ONLY public.support_tickets REPLICA IDENTITY FULL;


--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    terms_agreed boolean DEFAULT false NOT NULL,
    privacy_agreed boolean DEFAULT false NOT NULL,
    health_info_agreed boolean DEFAULT false NOT NULL,
    marketing_agreed boolean DEFAULT false,
    agreed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: water_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    amount integer NOT NULL,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: water_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    daily_goal integer DEFAULT 2000 NOT NULL,
    reminder_enabled boolean DEFAULT false,
    reminder_start time without time zone DEFAULT '08:00:00'::time without time zone,
    reminder_end time without time zone DEFAULT '22:00:00'::time without time zone,
    reminder_interval integer DEFAULT 90,
    evening_reminder boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: weekly_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    avg_calories integer DEFAULT 0,
    avg_protein integer DEFAULT 0,
    avg_carbs integer DEFAULT 0,
    avg_fat integer DEFAULT 0,
    calorie_goal_rate integer DEFAULT 0,
    protein_goal_rate integer DEFAULT 0,
    top_foods jsonb DEFAULT '[]'::jsonb,
    improvements jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weight_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    target_weight numeric(5,2) NOT NULL,
    target_date date NOT NULL,
    start_weight numeric(5,2) NOT NULL,
    start_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: weight_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_health_reports ai_health_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_health_reports
    ADD CONSTRAINT ai_health_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_health_reports ai_health_reports_source_record_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_health_reports
    ADD CONSTRAINT ai_health_reports_source_record_id_key UNIQUE (source_record_id);


--
-- Name: ai_health_reviews ai_health_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_health_reviews
    ADD CONSTRAINT ai_health_reviews_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: checkin_reports checkin_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_reports
    ADD CONSTRAINT checkin_reports_pkey PRIMARY KEY (id);


--
-- Name: checkin_templates checkin_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkin_templates
    ADD CONSTRAINT checkin_templates_pkey PRIMARY KEY (id);


--
-- Name: coach_availability coach_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_availability
    ADD CONSTRAINT coach_availability_pkey PRIMARY KEY (id);


--
-- Name: coach_notification_settings coach_notification_settings_coach_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_notification_settings
    ADD CONSTRAINT coach_notification_settings_coach_id_key UNIQUE (coach_id);


--
-- Name: coach_notification_settings coach_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_notification_settings
    ADD CONSTRAINT coach_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: coaching_feedback coaching_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_feedback
    ADD CONSTRAINT coaching_feedback_pkey PRIMARY KEY (id);


--
-- Name: coaching_records coaching_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_records
    ADD CONSTRAINT coaching_records_pkey PRIMARY KEY (id);


--
-- Name: coaching_sessions coaching_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_sessions
    ADD CONSTRAINT coaching_sessions_pkey PRIMARY KEY (id);


--
-- Name: consultation_requests consultation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_requests
    ADD CONSTRAINT consultation_requests_pkey PRIMARY KEY (id);


--
-- Name: custom_foods custom_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_foods
    ADD CONSTRAINT custom_foods_pkey PRIMARY KEY (id);


--
-- Name: daily_goal_achievements daily_goal_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_goal_achievements
    ADD CONSTRAINT daily_goal_achievements_pkey PRIMARY KEY (id);


--
-- Name: daily_goal_achievements daily_goal_achievements_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_goal_achievements
    ADD CONSTRAINT daily_goal_achievements_user_id_date_key UNIQUE (user_id, date);


--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);


--
-- Name: favorite_foods favorite_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_foods
    ADD CONSTRAINT favorite_foods_pkey PRIMARY KEY (id);


--
-- Name: guardian_connections guardian_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_connections
    ADD CONSTRAINT guardian_connections_pkey PRIMARY KEY (id);


--
-- Name: guardian_connections guardian_connections_user_id_guardian_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_connections
    ADD CONSTRAINT guardian_connections_user_id_guardian_id_key UNIQUE (user_id, guardian_id);


--
-- Name: gym_records gym_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gym_records
    ADD CONSTRAINT gym_records_pkey PRIMARY KEY (id);


--
-- Name: health_age_results health_age_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_age_results
    ADD CONSTRAINT health_age_results_pkey PRIMARY KEY (id);


--
-- Name: health_age_results health_age_results_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_age_results
    ADD CONSTRAINT health_age_results_user_unique UNIQUE (user_id);


--
-- Name: health_checkup_records health_checkup_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_checkup_records
    ADD CONSTRAINT health_checkup_records_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);


--
-- Name: inbody_records inbody_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbody_records
    ADD CONSTRAINT inbody_records_pkey PRIMARY KEY (id);


--
-- Name: meal_records meal_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_records
    ADD CONSTRAINT meal_records_pkey PRIMARY KEY (id);


--
-- Name: meal_sets meal_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_sets
    ADD CONSTRAINT meal_sets_pkey PRIMARY KEY (id);


--
-- Name: mission_templates mission_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_templates
    ADD CONSTRAINT mission_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nutrition_settings nutrition_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_settings
    ADD CONSTRAINT nutrition_settings_pkey PRIMARY KEY (user_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_key UNIQUE (order_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: phone_verification_codes phone_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_verification_codes
    ADD CONSTRAINT phone_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: point_history point_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_history
    ADD CONSTRAINT point_history_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_user_id_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_message_history support_ticket_message_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_message_history
    ADD CONSTRAINT support_ticket_message_history_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_replies support_ticket_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_replies
    ADD CONSTRAINT support_ticket_replies_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: user_activity user_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_pkey PRIMARY KEY (id);


--
-- Name: user_activity user_activity_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_user_id_key UNIQUE (user_id);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: user_consents user_consents_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: water_logs water_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_logs
    ADD CONSTRAINT water_logs_pkey PRIMARY KEY (id);


--
-- Name: water_settings water_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_settings
    ADD CONSTRAINT water_settings_pkey PRIMARY KEY (id);


--
-- Name: water_settings water_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_settings
    ADD CONSTRAINT water_settings_user_id_key UNIQUE (user_id);


--
-- Name: weekly_reports weekly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_pkey PRIMARY KEY (id);


--
-- Name: weight_goals weight_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_goals
    ADD CONSTRAINT weight_goals_pkey PRIMARY KEY (id);


--
-- Name: weight_goals weight_goals_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_goals
    ADD CONSTRAINT weight_goals_user_id_key UNIQUE (user_id);


--
-- Name: weight_records weight_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_records
    ADD CONSTRAINT weight_records_pkey PRIMARY KEY (id);


--
-- Name: gym_records_user_client_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX gym_records_user_client_unique ON public.gym_records USING btree (user_id, client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_audit_logs_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_admin ON public.admin_audit_logs USING btree (admin_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.admin_audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_target ON public.admin_audit_logs USING btree (target_table, target_id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_messages_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_receiver ON public.chat_messages USING btree (receiver_id);


--
-- Name: idx_chat_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_sender ON public.chat_messages USING btree (sender_id);


--
-- Name: idx_checkin_reports_coach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkin_reports_coach ON public.checkin_reports USING btree (coach_id);


--
-- Name: idx_checkin_reports_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkin_reports_user_date ON public.checkin_reports USING btree (user_id, report_date);


--
-- Name: idx_checkin_reports_user_date_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkin_reports_user_date_sent ON public.checkin_reports USING btree (user_id, report_date, sent_at DESC);


--
-- Name: idx_custom_foods_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_foods_name ON public.custom_foods USING btree (name);


--
-- Name: idx_custom_foods_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_foods_user_id ON public.custom_foods USING btree (user_id);


--
-- Name: idx_gym_records_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gym_records_user_date ON public.gym_records USING btree (user_id, date);


--
-- Name: idx_health_checkup_records_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_checkup_records_user_date ON public.health_checkup_records USING btree (user_id, date);


--
-- Name: idx_inbody_records_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbody_records_user_date ON public.inbody_records USING btree (user_id, date);


--
-- Name: idx_meal_records_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_records_user_date ON public.meal_records USING btree (user_id, date);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_reminders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_user_id ON public.reminders USING btree (user_id);


--
-- Name: idx_water_logs_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_water_logs_user_date ON public.water_logs USING btree (user_id, date);


--
-- Name: idx_weight_records_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weight_records_user_date ON public.weight_records USING btree (user_id, date);


--
-- Name: meal_records_user_client_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX meal_records_user_client_unique ON public.meal_records USING btree (user_id, client_id) WHERE (client_id IS NOT NULL);


--
-- Name: profiles prevent_sensitive_profile_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_sensitive_profile_update_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_update();


--
-- Name: ai_health_reviews update_ai_health_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_health_reviews_updated_at BEFORE UPDATE ON public.ai_health_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: coach_notification_settings update_coach_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_coach_notification_settings_updated_at BEFORE UPDATE ON public.coach_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: coaching_records update_coaching_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_coaching_records_updated_at BEFORE UPDATE ON public.coaching_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: daily_goal_achievements update_daily_goal_achievements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_goal_achievements_updated_at BEFORE UPDATE ON public.daily_goal_achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: health_age_results update_health_age_results_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_health_age_results_updated_at BEFORE UPDATE ON public.health_age_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: ai_health_reviews ai_health_reviews_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_health_reviews
    ADD CONSTRAINT ai_health_reviews_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.ai_health_reports(id) ON DELETE CASCADE;


--
-- Name: coach_availability coach_availability_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_availability
    ADD CONSTRAINT coach_availability_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: coach_notification_settings coach_notification_settings_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_notification_settings
    ADD CONSTRAINT coach_notification_settings_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: coaching_feedback coaching_feedback_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_feedback
    ADD CONSTRAINT coaching_feedback_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES auth.users(id);


--
-- Name: coaching_feedback coaching_feedback_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_feedback
    ADD CONSTRAINT coaching_feedback_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.coaching_sessions(id);


--
-- Name: coaching_feedback coaching_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_feedback
    ADD CONSTRAINT coaching_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: coaching_records coaching_records_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_records
    ADD CONSTRAINT coaching_records_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: coaching_records coaching_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_records
    ADD CONSTRAINT coaching_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: coaching_sessions coaching_sessions_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_sessions
    ADD CONSTRAINT coaching_sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: coaching_sessions coaching_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_sessions
    ADD CONSTRAINT coaching_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: custom_foods custom_foods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_foods
    ADD CONSTRAINT custom_foods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_logs daily_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: guardian_connections guardian_connections_guardian_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_connections
    ADD CONSTRAINT guardian_connections_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: guardian_connections guardian_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_connections
    ADD CONSTRAINT guardian_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: gym_records gym_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gym_records
    ADD CONSTRAINT gym_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: health_age_results health_age_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_age_results
    ADD CONSTRAINT health_age_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: health_checkup_records health_checkup_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_checkup_records
    ADD CONSTRAINT health_checkup_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: health_records health_records_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: health_records health_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: inbody_records inbody_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbody_records
    ADD CONSTRAINT inbody_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meal_records meal_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_records
    ADD CONSTRAINT meal_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mission_templates mission_templates_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_templates
    ADD CONSTRAINT mission_templates_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: mission_templates mission_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mission_templates
    ADD CONSTRAINT mission_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: nutrition_settings nutrition_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_settings
    ADD CONSTRAINT nutrition_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: point_history point_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_history
    ADD CONSTRAINT point_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_assigned_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_assigned_coach_id_fkey FOREIGN KEY (assigned_coach_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_tokens push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: support_ticket_message_history support_ticket_message_history_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_message_history
    ADD CONSTRAINT support_ticket_message_history_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.support_ticket_replies(id) ON DELETE CASCADE;


--
-- Name: support_ticket_replies support_ticket_replies_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_replies
    ADD CONSTRAINT support_ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_activity user_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_consents user_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: water_logs water_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_logs
    ADD CONSTRAINT water_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: water_settings water_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_settings
    ADD CONSTRAINT water_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weight_goals weight_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_goals
    ADD CONSTRAINT weight_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weight_records weight_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_records
    ADD CONSTRAINT weight_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_audit_logs Admins and coaches can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and coaches can create audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coach'::public.app_role)));


--
-- Name: coaching_feedback Admins can create any feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create any feedback" ON public.coaching_feedback FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_ticket_replies Admins can create replies on any ticket; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create replies on any ticket" ON public.support_ticket_replies FOR INSERT WITH CHECK (((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coach'::public.app_role)) AND (sender_type = 'admin'::text) AND (auth.uid() = user_id)));


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payments Admins can manage all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all payments" ON public.payments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_health_reports Admins can manage all reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reports" ON public.ai_health_reports USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: consultation_requests Admins can manage all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all requests" ON public.consultation_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_health_reviews Admins can manage all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reviews" ON public.ai_health_reviews USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_ticket_replies Admins can update any replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any replies" ON public.support_ticket_replies FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coach'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coach'::public.app_role)));


--
-- Name: admin_audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coaching_records Admins can view all coaching records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all coaching records" ON public.coaching_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: guardian_connections Admins can view all guardian connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all guardian connections" ON public.guardian_connections FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_ticket_message_history Admins can view all message history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all message history" ON public.support_ticket_message_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nutrition_settings Admins can view all nutrition settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all nutrition settings" ON public.nutrition_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_ticket_replies Admins can view all replies including deleted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all replies including deleted" ON public.support_ticket_replies FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: checkin_reports Admins can view all reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all reports" ON public.checkin_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Coaches and admins can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches and admins can create notifications" ON public.notifications FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'coach'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: health_records Coaches and admins can update health records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches and admins can update health records" ON public.health_records FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'coach'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coaching_feedback Coaches can create feedback for assigned users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can create feedback for assigned users" ON public.coaching_feedback FOR INSERT WITH CHECK (((auth.uid() = coach_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = coaching_feedback.user_id) AND (profiles.assigned_coach_id = auth.uid()))))));


--
-- Name: ai_health_reviews Coaches can manage assigned user reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can manage assigned user reviews" ON public.ai_health_reviews USING ((public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM (public.ai_health_reports r
     JOIN public.profiles p ON ((p.id = r.user_id)))
  WHERE ((r.id = ai_health_reviews.report_id) AND (p.assigned_coach_id = auth.uid()))))));


--
-- Name: mission_templates Coaches can manage missions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can manage missions" ON public.mission_templates TO authenticated USING ((public.has_role(auth.uid(), 'coach'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coach_availability Coaches can manage own availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can manage own availability" ON public.coach_availability TO authenticated USING (((auth.uid() = coach_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coaching_records Coaches can manage own coaching records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can manage own coaching records" ON public.coaching_records USING ((auth.uid() = coach_id));


--
-- Name: coach_notification_settings Coaches can manage own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can manage own notification settings" ON public.coach_notification_settings USING ((auth.uid() = coach_id));


--
-- Name: coaching_sessions Coaches can update coaching sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can update coaching sessions" ON public.coaching_sessions FOR UPDATE TO authenticated USING (((auth.uid() = coach_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: checkin_templates Coaches can view assigned user checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user checkins" ON public.checkin_templates FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = checkin_templates.user_id) AND (profiles.assigned_coach_id = auth.uid())))))));


--
-- Name: gym_records Coaches can view assigned user gym records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user gym records" ON public.gym_records FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = gym_records.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = gym_records.user_id))))));


--
-- Name: health_age_results Coaches can view assigned user health age results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user health age results" ON public.health_age_results FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = health_age_results.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = health_age_results.user_id))))));


--
-- Name: health_checkup_records Coaches can view assigned user health checkup records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user health checkup records" ON public.health_checkup_records FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = health_checkup_records.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = health_checkup_records.user_id))))));


--
-- Name: inbody_records Coaches can view assigned user inbody records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user inbody records" ON public.inbody_records FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = inbody_records.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = inbody_records.user_id))))));


--
-- Name: meal_records Coaches can view assigned user meal records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user meal records" ON public.meal_records FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = meal_records.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = meal_records.user_id))))));


--
-- Name: nutrition_settings Coaches can view assigned user nutrition settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user nutrition settings" ON public.nutrition_settings FOR SELECT USING ((public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = nutrition_settings.user_id) AND (profiles.assigned_coach_id = auth.uid()))))));


--
-- Name: ai_health_reports Coaches can view assigned user reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user reports" ON public.ai_health_reports FOR SELECT USING ((public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ai_health_reports.user_id) AND (p.assigned_coach_id = auth.uid()))))));


--
-- Name: checkin_reports Coaches can view assigned user reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user reports" ON public.checkin_reports FOR SELECT USING ((public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = checkin_reports.user_id) AND (profiles.assigned_coach_id = auth.uid()))))));


--
-- Name: water_logs Coaches can view assigned user water logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user water logs" ON public.water_logs FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = water_logs.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = water_logs.user_id))))));


--
-- Name: weight_records Coaches can view assigned user weight records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches can view assigned user weight records" ON public.weight_records FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = weight_records.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = weight_records.user_id))))));


--
-- Name: products Everyone can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active products" ON public.products FOR SELECT TO authenticated USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coach_availability Everyone can view coach availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view coach availability" ON public.coach_availability FOR SELECT TO authenticated USING (true);


--
-- Name: guardian_connections Guardians can update connection via RPC; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Guardians can update connection via RPC" ON public.guardian_connections FOR UPDATE USING (((auth.uid() = guardian_id) OR (auth.uid() = user_id) OR ((connection_code IS NOT NULL) AND (code_expires_at > now()))));


--
-- Name: point_history System can insert point history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert point history" ON public.point_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: weekly_reports System can insert weekly reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert weekly reports" ON public.weekly_reports FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: guardian_connections Users can create connection codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create connection codes" ON public.guardian_connections FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_ticket_message_history Users can create history for own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create history for own messages" ON public.support_ticket_message_history FOR INSERT WITH CHECK ((auth.uid() = edited_by));


--
-- Name: checkin_reports Users can create own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own reports" ON public.checkin_reports FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets Users can create own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own tickets" ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payments Users can create payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_ticket_replies Users can create replies on own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create replies on own tickets" ON public.support_ticket_replies FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (sender_type = 'user'::text) AND (EXISTS ( SELECT 1
   FROM public.support_tickets t
  WHERE ((t.id = support_ticket_replies.ticket_id) AND (t.user_id = auth.uid()) AND (t.is_deleted = false))))));


--
-- Name: ai_health_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.ai_health_reports FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: consultation_requests Users can create requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create requests" ON public.consultation_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_foods Users can delete own custom foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own custom foods" ON public.custom_foods FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: health_age_results Users can delete own health age results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own health age results" ON public.health_age_results FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: health_records Users can delete own health records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own health records" ON public.health_records FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: nutrition_settings Users can delete own nutrition settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own nutrition settings" ON public.nutrition_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: guardian_connections Users can delete their guardian connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their guardian connections" ON public.guardian_connections FOR DELETE USING (((auth.uid() = user_id) OR (auth.uid() = guardian_id)));


--
-- Name: coaching_sessions Users can insert coaching sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert coaching sessions" ON public.coaching_sessions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_foods Users can insert own custom foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own custom foods" ON public.custom_foods FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_logs Users can insert own daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own daily logs" ON public.daily_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: health_age_results Users can insert own health age results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own health age results" ON public.health_age_results FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: health_records Users can insert own health records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own health records" ON public.health_records FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: nutrition_settings Users can insert own nutrition settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own nutrition settings" ON public.nutrition_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders Users can insert own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: subscriptions Users can insert subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = payer_id));


--
-- Name: daily_goal_achievements Users can manage own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own achievements" ON public.daily_goal_achievements USING ((auth.uid() = user_id));


--
-- Name: user_activity Users can manage own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own activity" ON public.user_activity USING ((auth.uid() = user_id));


--
-- Name: checkin_templates Users can manage own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own checkins" ON public.checkin_templates USING ((auth.uid() = user_id));


--
-- Name: user_consents Users can manage own consents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own consents" ON public.user_consents USING ((auth.uid() = user_id));


--
-- Name: favorite_foods Users can manage own favorite foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own favorite foods" ON public.favorite_foods USING ((auth.uid() = user_id));


--
-- Name: gym_records Users can manage own gym records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own gym records" ON public.gym_records USING ((auth.uid() = user_id));


--
-- Name: health_checkup_records Users can manage own health checkup records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own health checkup records" ON public.health_checkup_records USING ((auth.uid() = user_id));


--
-- Name: inbody_records Users can manage own inbody records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own inbody records" ON public.inbody_records USING ((auth.uid() = user_id));


--
-- Name: meal_records Users can manage own meal records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own meal records" ON public.meal_records USING ((auth.uid() = user_id));


--
-- Name: meal_sets Users can manage own meal sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own meal sets" ON public.meal_sets USING ((auth.uid() = user_id));


--
-- Name: notification_settings Users can manage own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own notification settings" ON public.notification_settings USING ((auth.uid() = user_id));


--
-- Name: push_tokens Users can manage own push tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own push tokens" ON public.push_tokens USING ((auth.uid() = user_id));


--
-- Name: reminders Users can manage own reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own reminders" ON public.reminders USING ((auth.uid() = user_id));


--
-- Name: phone_verification_codes Users can manage own verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own verification codes" ON public.phone_verification_codes USING ((auth.uid() = user_id));


--
-- Name: water_logs Users can manage own water logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own water logs" ON public.water_logs USING ((auth.uid() = user_id));


--
-- Name: water_settings Users can manage own water settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own water settings" ON public.water_settings USING ((auth.uid() = user_id));


--
-- Name: weight_goals Users can manage own weight goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own weight goals" ON public.weight_goals USING ((auth.uid() = user_id));


--
-- Name: weight_records Users can manage own weight records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own weight records" ON public.weight_records USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can send messages to assigned coach; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages to assigned coach" ON public.chat_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.assigned_coach_id = chat_messages.receiver_id)))) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = chat_messages.receiver_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: custom_foods Users can update own custom foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own custom foods" ON public.custom_foods FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: daily_logs Users can update own daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own daily logs" ON public.daily_logs FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: health_age_results Users can update own health age results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own health age results" ON public.health_age_results FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: health_records Users can update own health records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own health records" ON public.health_records FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: nutrition_settings Users can update own nutrition settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own nutrition settings" ON public.nutrition_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: orders Users can update own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: support_ticket_replies Users can update own replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own replies" ON public.support_ticket_replies FOR UPDATE USING (((auth.uid() = user_id) AND (sender_type = 'user'::text))) WITH CHECK (((auth.uid() = user_id) AND (sender_type = 'user'::text)));


--
-- Name: support_tickets Users can update own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE USING ((((auth.uid() = user_id) AND (is_deleted = false)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: chat_messages Users can update read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update read status" ON public.chat_messages FOR UPDATE USING (((auth.uid() = receiver_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coaching_feedback Users can update read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update read status" ON public.coaching_feedback FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: support_ticket_replies Users can view non-deleted replies on own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view non-deleted replies on own tickets" ON public.support_ticket_replies FOR SELECT USING (((is_deleted = false) AND (EXISTS ( SELECT 1
   FROM public.support_tickets t
  WHERE ((t.id = support_ticket_replies.ticket_id) AND ((t.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)))))));


--
-- Name: coaching_sessions Users can view own coaching sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own coaching sessions" ON public.coaching_sessions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (auth.uid() = coach_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: custom_foods Users can view own custom foods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own custom foods" ON public.custom_foods FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_logs Users can view own daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own daily logs" ON public.daily_logs FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = daily_logs.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = daily_logs.user_id))))));


--
-- Name: coaching_feedback Users can view own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own feedback" ON public.coaching_feedback FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = coach_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: guardian_connections Users can view own guardian connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own guardian connections" ON public.guardian_connections FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (auth.uid() = guardian_id)));


--
-- Name: health_age_results Users can view own health age results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own health age results" ON public.health_age_results FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: health_records Users can view own health records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own health records" ON public.health_records FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = health_records.user_id) AND (profiles.assigned_coach_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = health_records.user_id))))));


--
-- Name: chat_messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: mission_templates Users can view own missions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own missions" ON public.mission_templates FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'coach'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: nutrition_settings Users can view own nutrition settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own nutrition settings" ON public.nutrition_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: point_history Users can view own point history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own point history" ON public.point_history FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'coach'::public.app_role) AND (assigned_coach_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.guardian_id = auth.uid()) AND (guardian_connections.user_id = profiles.id)))) OR (EXISTS ( SELECT 1
   FROM public.guardian_connections
  WHERE ((guardian_connections.user_id = auth.uid()) AND (guardian_connections.guardian_id = profiles.id))))));


--
-- Name: ai_health_reports Users can view own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reports" ON public.ai_health_reports FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: checkin_reports Users can view own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reports" ON public.checkin_reports FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: consultation_requests Users can view own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own requests" ON public.consultation_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (auth.uid() = payer_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: support_tickets Users can view own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING ((((auth.uid() = user_id) AND (is_deleted = false)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: weekly_reports Users can view own weekly reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own weekly reports" ON public.weekly_reports FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_health_reviews Users can view published reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view published reviews" ON public.ai_health_reviews FOR SELECT USING (((review_status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM public.ai_health_reports
  WHERE ((ai_health_reports.id = ai_health_reviews.report_id) AND (ai_health_reports.user_id = auth.uid()))))));


--
-- Name: admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_health_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_health_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_health_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_health_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: checkin_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkin_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: checkin_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkin_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: coach_availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: coach_notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coach_notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: coaching_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coaching_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: coaching_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coaching_records ENABLE ROW LEVEL SECURITY;

--
-- Name: coaching_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_foods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_goal_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_goal_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_foods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;

--
-- Name: guardian_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guardian_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: gym_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gym_records ENABLE ROW LEVEL SECURITY;

--
-- Name: health_age_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_age_results ENABLE ROW LEVEL SECURITY;

--
-- Name: health_checkup_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_checkup_records ENABLE ROW LEVEL SECURITY;

--
-- Name: health_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

--
-- Name: inbody_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: mission_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: nutrition_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutrition_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: point_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: support_ticket_message_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_ticket_message_history ENABLE ROW LEVEL SECURITY;

--
-- Name: support_ticket_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: user_consents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: water_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: water_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.water_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: weight_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: weight_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;