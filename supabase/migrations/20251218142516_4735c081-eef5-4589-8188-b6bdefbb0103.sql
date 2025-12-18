
-- 보안 취약 정책 삭제: 코치에게 전체 voice-files 접근 허용하는 정책 제거
DROP POLICY IF EXISTS "Coaches can view their voice files" ON storage.objects;
