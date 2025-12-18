# Health Yanggaeng (건강양갱) PRD

## Project Overview

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Health Yanggaeng (건강양갱) |
| **설명** | 시니어(50-60대)를 위한 종합 원격 건강관리 플랫폼. 건강 데이터 분석(1단계), 게이미피케이션을 통한 일상 습관 형성(2단계), 맞춤형 휴먼 코칭과 커머스(3단계)를 결합. "양갱"이라는 친근한 메타포로 진입 장벽을 낮춤. |
| **주요 타겟** | 1차: 쉬운 건강 관리가 필요한 시니어(50-60대) / 2차: 보호자/결제자 역할의 성인 자녀(30-40대) |

## Core Values

1. **단순함**: 큰 글씨, 최소 클릭, 가능한 음성 우선 인터페이스
2. **연결**: 코칭과 가족 공유를 통한 휴먼 터치
3. **실행 가능**: 복잡한 의료 데이터를 단순한 일일 미션으로 변환

## Tech Stack Strategy

| 영역 | 기술 |
|------|------|
| Frontend | React Native (Expo) - 빠른 크로스 플랫폼 개발 |
| Backend | Supabase - 인증, 실시간 DB(PostgreSQL), 스토리지 |
| AI Services | OCR & 이미지 분석: OpenAI GPT-4o Vision API, TTS/STT: 접근성용(옵션) |
| Payment | PortOne (KakaoPay, NaverPay) 또는 IAP |
| Video Call | WebRTC (Agora SDK/Twilio) 또는 카카오 페이스톡 연동(MVP) |

## User Stories by Phase

### Phase 1: Health Analysis (의료양갱)
- [1-1] 사용자로서, 비밀번호 기억 없이 카카오톡으로 로그인하고 싶다
- [1-2] 사용자로서, 건강검진 사진을 업로드하면 자동 분석되길 원한다
- [1-3] 사용자로서, 쉬운 용어로 설명된 "건강 성적표"를 보고 싶다
- [1-4] 사용자로서, 건강 상태 카드를 카카오톡으로 가족에게 공유하고 싶다

### Phase 2: Habit & Gamification (운동/영양양갱)
- [2-1] 사용자로서, 식사 사진을 찍어 즉각적인 AI 피드백을 받고 싶다
- [2-2] 사용자로서, 일일 미션(예: "30분 걷기")을 한 번의 탭으로 완료하고 싶다
- [2-3] 사용자로서, 건강한 활동으로 "양갱 포인트"를 모아 할인에 사용하고 싶다
- [2-4] 사용자로서, 주간 성취 요약을 보고 싶다

### Phase 3: Coaching & Commerce (프리미엄)
- [3-1] 사용자로서, 1:1 휴먼 코칭을 위해 프리미엄 플랜에 가입하고 싶다
- [3-2] 프리미엄 사용자로서, 앱 내에서 코치와 직접 영상통화하고 싶다
- [3-3] 사용자로서, 내 건강 데이터에 맞춘 상품 추천(영양제/식품)을 받고 싶다

## Functional Specifications

### Authentication & Onboarding
- 카카오 로그인 필수
- 전화번호 인증 (카카오 없는 어르신용)
- "보호자 모드": 자녀가 부모 데이터 조회용 계정 연동

### Core Feature: The 3 Yanggaengs (Dashboard)

#### 1. 의료양갱
- 기능: 검진 이미지 업로드 → GPT-4o Vision 처리 → 관리자 검토 → 결과 표시
- UI: "건강 나이" vs "실제 나이" 표시

#### 2. 영양양갱
- 기능: 음식 기록용 카메라
- 로직: AI가 이미지 분석 → 점수 증감 → 간단한 조언 ("너무 짜요!")

#### 3. 운동양갱
- 기능: 코치/AI가 배정한 3개 일일 미션 체크리스트
- 기능: "완료" 토글

### Gamification System
- 포인트: 미션당 10점, 식사 기록당 50점
- 연속: 연속 일수 배율
- 보상: 커머스 섹션용 쿠폰 생성

### Coaching & Admin Dashboard
- 코치 뷰 (웹):
  - 배정된 사용자 목록
  - 사용자의 최근 검진 데이터 + 일일 기록 준수율 대시보드
  - 채팅/영상통화 트리거
  - "미션 설정자": 일일 미션 수동 오버라이드 기능

### Commerce Engine
- 상품 DB: 건강 상태 태그 (#고혈압, #당뇨)
- 추천 로직: IF user.health_tags includes '고혈압' THEN recommend '저염 밀키트'

## Database Schema

### Users & Auth
```sql
users (
  id: uuid PRIMARY KEY,
  nickname: text,
  role: text, -- user, coach, admin
  tier: text DEFAULT 'basic', -- basic, premium
  current_points: integer DEFAULT 0,
  guardian_id: uuid NULLABLE, -- 자녀 연결
  created_at: timestamp
)
```

### Medical Data (Phase 1)
```sql
health_records (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users.id,
  raw_image_url: text,
  parsed_data: jsonb, -- 추출된 수치
  health_tags: array, -- ["high_bp", "obesity"]
  coach_comment: text,
  status: text -- pending, reviewed
)
```

### Daily Activity (Phase 2)
```sql
daily_logs (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users.id,
  date: date,
  type: text, -- food, exercise, mission
  content: text, -- "걷기", "김치찌개"
  image_url: text,
  ai_feedback: text,
  is_completed: boolean
)

point_history (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users.id,
  amount: integer,
  reason: text,
  created_at: timestamp
)
```

### Commerce & Coaching (Phase 3)
```sql
products (
  id: uuid PRIMARY KEY,
  name: text,
  price: integer,
  health_tags: array, -- health_records.health_tags와 매칭
  image_url: text,
  purchase_link: text
)

coaching_sessions (
  id: uuid PRIMARY KEY,
  coach_id: uuid REFERENCES users.id,
  user_id: uuid REFERENCES users.id,
  scheduled_at: timestamp,
  status: text, -- booked, completed
  video_room_id: text
)
```

## UI/UX Guidelines

### Accessibility
- 최소 폰트 크기: 18px (본문), 24px (헤더)
- 고대비: 흰색/연한 노랑 배경에 검은 텍스트
- 버튼: "팻 핑거" 친화적 (최소 높이 48px, 전체 너비 권장)

### Tone & Manner
- 따뜻하고, 격려하며, 존중하는 (한국어 존댓말 사용)
- 메타포: 버튼에 "양갱" (블록 모양) 시각적 단서 사용

## Implementation Steps

1. Supabase 프로젝트 설정 및 마스터 스키마 적용
2. 카카오 로그인 & 기본 네비게이션 구현 (3개 양갱 탭 바)
3. "의료양갱" 먼저 구축 (업로드 → OCR 플로우)
4. "일일 기록" 기능 구축 (카메라 & 토글)
5. 코치용 관리자 대시보드 구축
6. (마지막) 코칭 영상통화 & 커머스 탭 구현
