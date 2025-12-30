# 건강양갱 개발 진행 상황

> **문서 목적**: 현재 구현 상태와 남은 작업을 한눈에 파악
> **최종 목표**: 실제 출시·운영 가능한 헬스케어 서비스

---

## 📊 전체 진행률

| Phase | 진행률 | 상태 |
|-------|--------|------|
| 기반 구조 | 70% | 🟡 진행중 |
| Phase 1 (의료양갱) | 30% | 🟡 진행중 |
| Phase 2 (영양/운동양갱) | 20% | 🟡 진행중 |
| Phase 3 (프리미엄/커머스) | 10% | 🟡 진행중 |
| 코치 대시보드 | 30% | 🟡 진행중 |
| 관리자 대시보드 | 30% | 🟡 진행중 |

---

## 🚀 현재 진행 중 (Iteration 1/3)

### 마이탭 UI 변경
| 기능 | 상태 | 비고 |
|------|------|------|
| 포인트 관련 UI 전부 제거 | ✅ 완료 | 마이탭, 헤더 우측상단 포인트 표시 모두 삭제 |
| 데이터 내보내기 버튼 삭제 | ✅ 완료 | 마이탭 메뉴에서 제거 |

### 고객센터 FAQ UI/내용 변경
| 기능 | 상태 | 비고 |
|------|------|------|
| FAQ 리스트 모바일 1줄 고정 | ✅ 완료 | truncate + text-sm 적용 |
| "포인트는 어떻게 적립하나요?" 삭제 | ✅ 완료 | FAQ 배열에서 제거 |

### 고객센터 "내 문의" 스레드 시스템
| 기능 | 상태 | 비고 |
|------|------|------|
| DB 스키마 확장 | ✅ 완료 | support_ticket_replies에 sender_type, soft delete 추가 |
| 수정 이력 테이블 | ✅ 완료 | support_ticket_message_history 테이블 생성 |
| RLS 정책 업데이트 | ✅ 완료 | 사용자 INSERT/UPDATE 허용, 관리자 전체 조회 |
| Realtime 활성화 | ✅ 완료 | support_ticket_replies 테이블 realtime 추가 |
| 스레드 형태 UI | 🟡 진행중 | 사용자/관리자 메시지 통합 표시 |
| 수정/삭제 기능 | 🟡 진행중 | soft delete + history 저장 |
| 실시간 알림 | ⏳ 대기 | notifications 테이블 연동 |

---

## ✅ 구현 완료

### 문서화
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| PRD 상세 문서 | - | All | docs/PRD.md (v2.0 완성) |
| TODO 관리 문서 | - | All | docs/TODOs.md |

### 데이터베이스 (Lovable Cloud)
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| profiles 테이블 | 1 | All | 사용자 프로필 |
| user_roles 테이블 | 1 | All | 역할 관리 (보안용 별도) |
| guardian_connections 테이블 | 1 | User/Guardian | 보호자 연결 |
| health_records 테이블 | 1 | User/Coach | 건강검진 데이터 |
| daily_logs 테이블 | 2 | User | 일일 활동 기록 |
| mission_templates 테이블 | 2 | User/Coach | 미션 설정 |
| point_history 테이블 | 2 | User | 포인트 내역 |
| coaching_sessions 테이블 | 3 | User/Coach | 코칭 세션 |
| coach_availability 테이블 | 3 | Coach | 코치 가용 시간 |
| products 테이블 | 3 | Admin | 커머스 상품 |
| subscriptions 테이블 | 3 | User/Guardian | 구독 정보 |
| support_tickets 테이블 | 1 | User/Admin | 고객 문의 (soft delete 추가) |
| support_ticket_replies 테이블 | 1 | User/Admin | 문의 답변 (sender_type, soft delete 추가) |
| support_ticket_message_history 테이블 | 1 | Admin | 메시지 수정 이력 |
| has_role() 함수 | 1 | All | 역할 체크 (Security Definer) |
| handle_new_user() 트리거 | 1 | All | 자동 프로필 생성 |
| RLS 정책 전체 | 1-3 | All | 모든 테이블 권한 설정 완료 |

### 인증 시스템
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| 이메일/비밀번호 로그인 | 1 | All | 구현 완료 |
| 이메일/비밀번호 회원가입 | 1 | All | 구현 완료 |
| 회원 유형 선택 | 1 | User/Guardian | 가입 시 선택 |
| 자동 프로필 생성 | 1 | All | DB 트리거로 자동 |
| 로그아웃 | 1 | All | 구현 완료 |
| 이메일 자동 확인 | 1 | All | 설정 완료 |

### 프론트엔드 기반
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| 디자인 시스템 | - | All | 시니어 친화적 색상/폰트/간격 |
| 랜딩 페이지 | - | All | 서비스 소개 페이지 |
| Button 컴포넌트 | - | All | 시니어 친화적 변형 추가 |
| AuthContext | 1 | All | 인증 상태 관리 |
| ProtectedRoute | 1 | All | 역할별 접근 제어 |
| AppLayout | 1 | User/Guardian | 하단 네비게이션 포함 |

### 고객 앱 페이지
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| 로그인/회원가입 페이지 | 1 | All | /auth |
| 메인 대시보드 | 1 | User/Guardian | /dashboard |
| 의료양갱 페이지 | 1 | User | /medical (UI만) |
| 영양양갱 페이지 | 2 | User | /nutrition (UI만) |
| 운동양갱 페이지 | 2 | User | /exercise (UI만) |
| 프로필 페이지 | 1 | User/Guardian | /profile |
| 하단 네비게이션 | 1 | User/Guardian | 5개 탭 |

### 코치 대시보드
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| 코치 대시보드 메인 | 1 | Coach | /coach (UI만) |
| 담당 회원 리스트 | 1 | Coach | 테이블 형태 |

### 관리자 대시보드
| 기능 | Phase | 사용자 | 비고 |
|------|-------|--------|------|
| 관리자 대시보드 메인 | 1 | Admin | /admin (UI만) |
| 통계 요약 카드 | 1 | Admin | 회원/매출 등 |
| 메뉴 그리드 | 1 | Admin | 6개 관리 메뉴 |

---

## 🛠 부분 구현 (보완 필요)

| 기능 | Phase | 사용자 | 현재 상태 | 다음 액션 |
|------|-------|--------|----------|----------|
| 의료양갱 | 1 | User | UI만 존재 | 이미지 업로드 + AI 분석 연동 |
| 영양양갱 | 2 | User | UI만 존재 | 카메라 + AI 분석 연동 |
| 운동양갱 | 2 | User | UI만 (로컬 상태) | DB 연동 + 포인트 시스템 |
| 코치 대시보드 | 1 | Coach | Mock 데이터 | 실제 DB 연동 |
| 관리자 대시보드 | 1 | Admin | Mock 데이터 | 실제 DB 연동 |

---

## ⛔ 미구현 (필수 작업)

### 🔐 인증 추가 기능
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 카카오 로그인 | 1 | All | Kakao OAuth Provider 설정 필요 |
| 전화번호 인증 | 1 | User | SMS API 연동 필요 |

### 👥 보호자 기능 (Phase 1)
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 연결 코드 생성 | 1 | User | Edge Function 구현 |
| 연결 코드 입력 | 1 | Guardian | 코드 검증 페이지 |
| 부모 건강 리포트 열람 | 1 | Guardian | 연결된 부모 데이터 조회 UI |
| 부모 미션 현황 확인 | 2 | Guardian | 미션 완료율 표시 |
| 부모 프리미엄 대리 결제 | 3 | Guardian | 결제 API 연동 |

### 🏥 의료양갱 기능 (Phase 1)
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 이미지 업로드 | 1 | User | Supabase Storage 연동 |
| AI 분석 Edge Function | 1 | System | GPT-4o Vision API 연동 |
| 분석 상태 실시간 표시 | 1 | User | Realtime 구독 |
| 코치 검토 페이지 | 1 | Coach | 검토 UI + 코멘트 작성 |
| 카카오톡 공유 | 1 | User | Kakao SDK 연동 |

### 🍽 영양양갱 기능 (Phase 2)
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 음식 사진 촬영 | 2 | User | 카메라 API 연동 |
| 음식 AI 분석 | 2 | System | GPT-4o Vision 음식 인식 |
| 식사 기록 저장 | 2 | User | DB 연동 |

### 🏃 운동양갱 기능 (Phase 2)
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 미션 DB 연동 | 2 | User | mission_templates 조회 |
| 미션 완료 저장 | 2 | User | daily_logs 저장 |
| 포인트 적립 | 2 | User | point_history 저장 + 프로필 업데이트 |
| 연속 달성 계산 | 2 | System | 연속일 계산 로직 |
| 주간 요약 리포트 | 2 | User | 통계 쿼리 + UI |

### ⭐ 프리미엄 & 코칭 (Phase 3)
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 프리미엄 안내 페이지 | 3 | User | /premium 페이지 |
| 구독 결제 | 3 | User/Guardian | PortOne 결제 연동 |
| 결제 상태 관리 | 3 | System | Webhook + 만료 체크 |
| 코치 일정 조회 | 3 | User | coach_availability 조회 |
| 코칭 예약 | 3 | User | coaching_sessions 생성 |
| 영상통화 진입 | 3 | User/Coach | Agora SDK 연동 |

### 🛒 커머스 (Phase 3)
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 상품 목록 페이지 | 3 | User | products 조회 |
| 맞춤 추천 로직 | 3 | System | health_tags 매칭 |
| 포인트 할인 적용 | 3 | User | 포인트 차감 |

### 👨‍⚕️ 코치 대시보드 상세
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 실제 데이터 연동 | 1 | Coach | profiles/health_records 조회 |
| 회원 상세 페이지 | 1 | Coach | /coach/user/:id |
| 건강검진 검토 | 1 | Coach | 상태 변경 + 코멘트 |
| 미션 설정 | 2 | Coach | mission_templates 수정 |
| 영상통화 시작 | 3 | Coach | Agora 룸 생성 |

### 🔧 관리자 대시보드 상세
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| 사용자 관리 페이지 | 1 | Admin | /admin/users |
| 코치 계정 관리 | 1 | Admin | /admin/coaches |
| 건강검진 최종 승인 | 1 | Admin | /admin/health-records |
| 상품 관리 | 3 | Admin | /admin/products |
| 포인트 정책 관리 | 2 | Admin | /admin/points |
| 통계 대시보드 | 1 | Admin | /admin/stats |

### 📲 모바일 앱 배포
| 기능 | Phase | 사용자 | 다음 액션 |
|------|-------|--------|----------|
| PWA 설정 | 1 | User | vite-plugin-pwa 설정 |
| Capacitor 설정 | 1 | User | iOS/Android 빌드 |

---

## 📋 다음 단계 우선순위

### 🔴 즉시 필요
1. **고객센터 스레드 UI 구현** - 수정/삭제 + 실시간 알림
2. **의료양갱 이미지 업로드** - Storage 연동
3. **의료양갱 AI 분석** - Edge Function + GPT-4o Vision

### 🟡 Phase 1 완료 목표
1. 코치 대시보드 실제 데이터 연동
2. 건강검진 검토 기능
3. 보호자 연결 기능

### 🟢 이후 단계
1. 영양/운동양갱 DB 연동
2. 포인트 시스템 완성
3. 프리미엄 결제
4. 영상 코칭

---

## 📝 기술 의사결정 필요

| 항목 | 옵션 | 결정 상태 |
|------|------|----------|
| 모바일 앱 방식 | PWA vs Capacitor | 미정 |
| 영상통화 SDK | Agora vs Twilio vs Daily.co | 미정 |
| 결제 PG | PortOne (Toss) vs 직접연동 | 미정 |
| SMS 인증 | Supabase Phone vs 외부(알리고 등) | 미정 |
| AI 서비스 | Lovable AI vs OpenAI 직접 | Lovable AI 권장 |

---

## 🔄 업데이트 이력

| 날짜 | 내용 |
|------|------|
| 2024-XX-XX | 초기 문서 작성 |
| 2024-XX-XX | PRD v2.0 완성, DB 스키마 구현, 기본 앱 구조 완성 |
| 2024-12-30 | 마이탭 포인트 UI 제거, FAQ 개선, 고객센터 스레드 DB 스키마 추가 |