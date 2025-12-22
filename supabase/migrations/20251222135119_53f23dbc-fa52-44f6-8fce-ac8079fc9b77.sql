-- RPC 함수: 보호자가 코드로 연결 (RLS 우회를 위한 security definer)
CREATE OR REPLACE FUNCTION public.connect_guardian_with_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- guardian_connections 테이블의 guardian_id를 nullable로 변경 (pending 상태 지원)
ALTER TABLE public.guardian_connections ALTER COLUMN guardian_id DROP NOT NULL;

-- 기존 RLS 정책 업데이트: 연결 코드로 조회 허용
DROP POLICY IF EXISTS "Users can view connection by code" ON guardian_connections;
CREATE POLICY "Users can view connection by code"
ON guardian_connections
FOR SELECT
USING (
  connection_code IS NOT NULL 
  AND code_expires_at > now()
);

-- 보호자가 pending connection을 업데이트할 수 있도록 허용
DROP POLICY IF EXISTS "Guardians can update connection" ON guardian_connections;
CREATE POLICY "Guardians can update connection via RPC"
ON guardian_connections
FOR UPDATE
USING (
  (auth.uid() = guardian_id) 
  OR (auth.uid() = user_id)
  OR (connection_code IS NOT NULL AND code_expires_at > now())
);