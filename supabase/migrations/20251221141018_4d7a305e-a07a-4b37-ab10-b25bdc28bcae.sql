
-- 관리자가 모든 프로필을 업데이트할 수 있도록 정책 추가
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 관리자가 모든 user_roles를 조회할 수 있도록 정책 확인/추가
-- (이미 있을 수 있으므로 IF NOT EXISTS 사용 불가, 에러 무시)
