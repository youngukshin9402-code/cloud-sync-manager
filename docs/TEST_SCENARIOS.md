# 정식 출시 테스트 시나리오

## 역할별 테스트 계정

| 역할 | 이메일 패턴 | 설명 |
|------|-------------|------|
| Admin | admin@s23270351*.com | 관리자 (비밀번호는 Supabase Auth에서 설정) |
| Coach | coach 역할이 user_roles에 설정된 계정 | 코치 |
| User | 일반 회원가입 계정 | 일반 사용자 |

---

## [P0] RLS 검증 시나리오

### 1. support_tickets (고객센터 티켓)

#### User 시나리오
1. `/mypage/support` 접속
2. "문의하기" 버튼 클릭
3. 제목/내용 입력 후 제출 → 티켓 생성 확인
4. 생성된 티켓 목록에서 본인 티켓만 표시되는지 확인
5. 티켓 상세 클릭 → 내용 확인
6. 답변 추가 → 정상 저장 확인

#### Admin 시나리오
1. `/admin/tickets` 접속
2. 전체 티켓 목록 표시 확인
3. 특정 티켓 선택 → 상태 변경 (open → in_progress → closed)
4. 답변 작성 → 저장 확인
5. User 계정으로 로그인하여 Admin 답변 표시 확인

### 2. coaching_feedback (코칭 피드백)

#### Coach 시나리오
1. `/coach/dashboard` 접속
2. 담당 회원 목록 확인
3. 특정 회원의 "피드백" 버튼(MessageSquare 아이콘) 클릭
4. 텍스트 피드백 입력 → "피드백 전송" 클릭
5. 다시 동일 회원에게 음성 파일 업로드 → 전송
6. 성공 토스트 확인

#### User 시나리오
1. `/mypage/coaching-feedback` 접속
2. 코치가 보낸 피드백 목록 확인
3. 텍스트 피드백 내용 확인
4. 음성 피드백 → "음성 메시지 재생" 버튼 클릭
5. 오디오 재생 확인

#### Admin 시나리오
1. Admin 계정으로 `/admin/coaching` 접속
2. 코칭 세션 목록 확인
3. 코치 배정 기능 테스트

### 3. orders (주문)

#### User 시나리오
1. `/shop` 접속
2. 코칭 상품 선택 → "상담 신청" 클릭
3. 폼 입력 후 "상담 신청하기" 클릭
4. `/mypage/orders` 에서 주문 내역 확인
5. 상태가 "requested"로 표시 확인

#### Admin 시나리오
1. `/admin/orders` 접속
2. 전체 주문 목록 확인
3. 특정 주문 상태 변경:
   - requested → paid
   - paid → coaching_started
   - (필요시) → cancelled → refunded
4. User 계정에서 상태 변경 반영 확인

### 4. Storage (food-logs / voice-files)

#### voice-files 권한 테스트
1. **User**: 본인 userId 폴더의 파일만 조회 가능
2. **Coach**: 담당 사용자(assigned_coach_id 매칭)의 폴더만 조회/업로드 가능
3. **Admin**: 모든 폴더 접근 가능

#### 테스트 방법
1. Coach가 담당 사용자에게 음성 피드백 업로드
2. User가 해당 피드백 재생 확인
3. 다른 User 계정으로 접속 → 해당 파일 접근 불가 확인
4. Coach가 담당하지 않는 사용자 폴더 접근 시도 → 실패 확인

---

## [P0] 관리자 리다이렉트 테스트

1. admin@s23270351*.com 이메일로 로그인
2. 로그인 성공 후 `/admin/dashboard`로 자동 이동 확인
3. 일반 사용자로 로그인 → `/dashboard`로 이동 확인
4. Coach 역할로 로그인 → `/coach/dashboard`로 이동 확인

---

## [P0] ProtectedRoute 테스트

### Profile null 케이스
1. User가 있지만 profile이 없는 상태 시뮬레이션
2. "프로필 로드 오류" 메시지와 함께 로그인 페이지 이동 버튼 표시 확인

### 권한 체크
1. 일반 User로 `/admin/dashboard` 접속 시도 → `/forbidden` 리다이렉트 확인
2. 일반 User로 `/coach/dashboard` 접속 시도 → `/forbidden` 리다이렉트 확인
3. Coach로 `/admin/dashboard` 접속 시도 → `/forbidden` 리다이렉트 확인

---

## [P0] 외부결제 플로우 테스트

1. `/shop` 접속
2. 상품 선택 → "상담 신청" 클릭
3. 이름/연락처 입력 후 "상담 신청하기" 클릭
4. 신청 완료 화면 확인:
   - "앱 내 결제가 진행되지 않습니다" 문구 확인
   - "상담 후 결제 링크 발송" 안내 확인
5. `/mypage/orders`에서 주문 상태 "requested" 확인

---

## [P0] 회원탈퇴 테스트

1. `/mypage/profile-edit` 접속
2. "회원 탈퇴" 섹션 확인
3. 데이터 삭제 정책 안내 문구 확인
4. 탈퇴 진행 (테스트 계정만)
5. auth.users, profiles, 관련 데이터 삭제 확인

---

## 변경된 DB 테이블/스토리지

### DB 테이블
- `support_tickets` - 고객센터 티켓
- `support_ticket_replies` - 티켓 답변
- `coaching_feedback` - 코칭 피드백
- `orders` - 주문 (status enum 업데이트: requested, paid, coaching_started, cancelled, refunded)

### Storage Buckets
- `voice-files` - 코칭 음성 피드백 (RLS 적용)
- `food-logs` - 식사 사진

---

## 추가된 라우트

| 경로 | 권한 | 설명 |
|------|------|------|
| /admin/orders | admin | 주문 관리 |
| /admin/coaching | admin | 코칭 관리 |
| /admin/tickets | admin | 티켓 관리 |
| /mypage/coaching-feedback | user | 코칭 피드백 확인 |
| /refund-policy | public | 환불 정책 |

---

## 남은 리스크 (출시 기준)

### 즉시 조치 필요
1. **Leaked Password Protection**: Supabase 대시보드에서 활성화 권장
2. **Admin 계정 생성**: Supabase Auth에서 admin@s23270351*.com 계정 생성 및 비밀번호 설정 필요
3. **Admin 역할 할당**: user_roles 테이블에 admin 역할 INSERT 필요

### 권장 사항
1. **이메일 발송 설정**: 고객 문의 자동 알림 등
2. **백업 정책**: 정기 데이터 백업 설정
3. **모니터링**: 에러 로깅 및 알림 설정

---

## Admin 계정 설정 방법

```sql
-- 1. Supabase Auth에서 admin@s23270351*.com 계정 생성 후
-- 2. user_roles 테이블에 admin 역할 추가
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@s23270351*.com';

-- Coach 역할 추가 예시
INSERT INTO public.user_roles (user_id, role)
VALUES ('코치_유저_UUID', 'coach');
```
