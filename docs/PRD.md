# 건강양갱 (Health Yanggaeng) PRD v2.0

> **문서 목적**: 이 PRD는 실제 개발팀이 바로 개발을 시작할 수 있는 기준 문서입니다.
> **최종 목표**: 실제 출시·운영 가능한 헬스케어 앱 전체 구조 설계·구현

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [사용자 유형 정의](#2-사용자-유형-정의)
3. [Phase 1: 의료양갱 (Health Analysis)](#3-phase-1-의료양갱)
4. [Phase 2: 영양/운동양갱 (Habit & Gamification)](#4-phase-2-영양운동양갱)
5. [Phase 3: 프리미엄 코칭 & 커머스](#5-phase-3-프리미엄-코칭--커머스)
6. [관리 시스템](#6-관리-시스템)
7. [기술 아키텍처](#7-기술-아키텍처)
8. [데이터베이스 스키마](#8-데이터베이스-스키마)

---

## 1. 프로젝트 개요

### 1.1 서비스 정의
| 항목 | 내용 |
|------|------|
| **서비스명** | 건강양갱 (Health Yanggaeng) |
| **핵심 가치** | 복잡한 건강 데이터를 쉽게 이해하고, 일상 습관으로 건강 관리 |
| **비즈니스 모델** | 프리미엄 구독 (보호자 결제) + 커머스 연동 |

### 1.2 성공 기준
- ✅ 부모(50~60대)가 **혼자** 사용 가능
- ✅ 보호자(자녀)가 **결제하고 관리** 가능
- ✅ 코치가 **매일 업무 도구**로 사용 가능
- ✅ 관리자가 **혼자서 운영** 가능

### 1.3 핵심 UX 원칙 (고령자 기준)
| 원칙 | 구현 |
|------|------|
| 큰 글씨 | 본문 18px 이상, 헤더 24px 이상 |
| 최소 클릭 | 주요 액션 3클릭 이내 완료 |
| 고대비 | 명도 대비 4.5:1 이상 |
| 큰 터치 영역 | 버튼 최소 48px × 48px |
| 존댓말 | 모든 안내 메시지 존댓말 사용 |

---

## 2. 사용자 유형 정의

### 2.1 일반 사용자 (User) - 부모
| 항목 | 내용 |
|------|------|
| **목적** | 건강 검진 분석, 일일 미션 수행, 포인트 적립 |
| **연령대** | 50~60대 |
| **가입 방식** | 카카오 로그인 또는 전화번호 인증 |
| **주요 화면** | 메인 대시보드, 건강검진 업로드, 미션 체크리스트, 포인트 현황 |
| **예외 케이스** | 카카오 미사용 → 전화번호 인증 제공 |

### 2.2 보호자 (Guardian) - 자녀
| 항목 | 내용 |
|------|------|
| **목적** | 부모 건강 상태 모니터링, 프리미엄 결제 |
| **연령대** | 30~40대 |
| **가입 방식** | 카카오 로그인 (필수) |
| **주요 화면** | 부모 연결 페이지, 건강 리포트 열람, 결제 관리 |
| **핵심 권한** | - 연결된 부모의 건강 요약 리포트 열람 <br>- 미션 수행 여부 확인 <br>- 프리미엄 구독 결제/관리 |

### 2.3 코치 (Coach)
| 항목 | 내용 |
|------|------|
| **목적** | 담당 회원 건강 관리, 미션 설정, 영상 코칭 |
| **접근 방식** | 웹 대시보드 (PC 기준) |
| **주요 화면** | 담당 회원 리스트, 건강 데이터 상세, 미션 설정, 영상통화 |
| **핵심 권한** | - 담당 회원 건강 데이터 열람 <br>- 일일 미션 수동 설정 <br>- 건강검진 결과 코멘트 작성 <br>- 영상 코칭 세션 진행 |

### 2.4 관리자 (Admin)
| 항목 | 내용 |
|------|------|
| **목적** | 서비스 전체 운영, 데이터 관리 |
| **접근 방식** | 웹 대시보드 (PC 기준) |
| **주요 화면** | 사용자 관리, 코치 관리, 건강검진 승인, 상품 관리, 포인트 정책 |
| **핵심 권한** | - 모든 사용자 CRUD <br>- 코치 계정 생성/관리 <br>- 건강검진 데이터 최종 승인/반려 <br>- 커머스 상품 관리 <br>- 포인트 정책 설정 |

---

## 3. Phase 1: 의료양갱

### 3.1 회원가입 / 로그인

#### 기능: 카카오 로그인
| 항목 | 내용 |
|------|------|
| **목적** | 비밀번호 기억 부담 없이 간편 가입 |
| **사용자 유형** | 모든 사용자 |
| **입력** | 카카오 계정 인증 |
| **출력** | JWT 토큰 발급, 사용자 세션 생성 |
| **예외 케이스** | 카카오 인증 실패 → "다시 시도해주세요" 안내 |

#### 기능: 전화번호 인증 (고령자 대비)
| 항목 | 내용 |
|------|------|
| **목적** | 카카오 미사용 고령자를 위한 대체 인증 |
| **사용자 유형** | 일반 사용자 (User) |
| **입력** | 전화번호, SMS 인증코드 (6자리) |
| **출력** | 계정 생성 또는 로그인 |
| **예외 케이스** | - 인증번호 불일치 → "번호를 다시 확인해주세요" <br>- 3회 실패 → 5분 대기 |

#### 기능: 회원 유형 선택
| 항목 | 내용 |
|------|------|
| **목적** | 사용자 역할에 맞는 서비스 제공 |
| **화면** | 가입 완료 후 "어떻게 사용하실 건가요?" |
| **선택지** | "직접 건강 관리할게요" (User) / "부모님 건강 관리할게요" (Guardian) |
| **출력** | user_type 저장 |

### 3.2 보호자 연결

#### 기능: 연결 코드 생성 (부모)
| 항목 | 내용 |
|------|------|
| **목적** | 자녀에게 공유할 연결 코드 생성 |
| **사용자 유형** | 일반 사용자 (User) |
| **화면** | 설정 > 보호자 연결 > "코드 생성하기" |
| **입력** | 버튼 클릭 |
| **출력** | 6자리 영숫자 코드 (24시간 유효) |
| **예외 케이스** | 이미 연결된 보호자 있음 → "현재 연결: OOO님" 표시 |

#### 기능: 연결 코드 입력 (보호자)
| 항목 | 내용 |
|------|------|
| **목적** | 부모 계정과 연결 |
| **사용자 유형** | 보호자 (Guardian) |
| **화면** | 대시보드 > "부모님 연결하기" |
| **입력** | 6자리 연결 코드 |
| **출력** | 연결 완료, 부모 건강 데이터 접근 권한 부여 |
| **예외 케이스** | - 만료된 코드 → "코드가 만료되었습니다" <br>- 잘못된 코드 → "코드를 확인해주세요" |

### 3.3 건강검진 이미지 업로드

#### 기능: 이미지 업로드
| 항목 | 내용 |
|------|------|
| **목적** | 건강검진 결과지 사진 제출 |
| **사용자 유형** | 일반 사용자 (User) |
| **화면** | 의료양갱 > "검진 결과 올리기" |
| **입력** | 카메라 촬영 또는 갤러리 선택 (1~5장) |
| **출력** | 업로드 완료, 상태: "분석 중" |
| **예외 케이스** | - 이미지 흐림 → "더 선명하게 찍어주세요" <br>- 용량 초과 (10MB) → "파일이 너무 커요" |

#### 기능: AI 분석 처리
| 항목 | 내용 |
|------|------|
| **목적** | 건강검진 결과지에서 데이터 추출 |
| **처리 방식** | GPT-4o Vision API |
| **입력** | 업로드된 이미지 |
| **출력** | parsed_data (JSON): 혈압, 혈당, 콜레스테롤 등 수치 |
| **상태 변경** | "분석 중" → "코치 검토 중" |

#### 기능: 코치 검토
| 항목 | 내용 |
|------|------|
| **목적** | AI 분석 결과 검증 및 코멘트 추가 |
| **사용자 유형** | 코치 (Coach) |
| **화면** | 코치 대시보드 > 검토 대기 목록 |
| **입력** | 데이터 확인, 코멘트 작성 |
| **출력** | coach_comment 저장, 상태: "결과 완료" |

### 3.4 건강 리포트 화면

#### 기능: 결과 카드 표시
| 항목 | 내용 |
|------|------|
| **목적** | 건강 상태를 쉽게 이해 |
| **사용자 유형** | 일반 사용자, 보호자 |
| **화면 구성** | |

```
┌─────────────────────────────────────┐
│  👤 홍길동님의 건강 리포트           │
│  검진일: 2024.01.15                 │
├─────────────────────────────────────┤
│  🎂 건강 나이: 52세                 │
│     실제 나이: 58세 (-6세!)         │
├─────────────────────────────────────┤
│  ✅ 정상    │ 혈압, 간 기능, 신장    │
│  ⚠️ 주의    │ 콜레스테롤             │
│  🔴 관리필요 │ 혈당                   │
├─────────────────────────────────────┤
│  💬 코치 코멘트                      │
│  "혈당 관리에 신경 쓰시면 좋겠어요"  │
├─────────────────────────────────────┤
│  [카카오톡 공유하기]                 │
└─────────────────────────────────────┘
```

| **예외 케이스** | 아직 결과 없음 → "검진 결과를 올려주세요" 안내 |

#### 기능: 카카오톡 공유
| 항목 | 내용 |
|------|------|
| **목적** | 가족에게 건강 상태 공유 |
| **입력** | "공유하기" 버튼 클릭 |
| **출력** | 카카오톡 공유 메시지 (이미지 카드 형태) |
| **공유 내용** | 건강 나이, 상태 요약 (상세 수치 제외) |

---

## 4. Phase 2: 영양/운동양갱

### 4.1 영양양갱 - 음식 사진 분석

#### 기능: 음식 사진 촬영
| 항목 | 내용 |
|------|------|
| **목적** | 식사 기록 및 영양 피드백 |
| **사용자 유형** | 일반 사용자 (User) |
| **화면** | 영양양갱 > "오늘 뭐 드셨어요?" |
| **입력** | 카메라 촬영 또는 갤러리 |
| **출력** | AI 피드백 메시지, 포인트 적립 (+50점) |

#### 기능: AI 음식 분석
| 항목 | 내용 |
|------|------|
| **처리 방식** | GPT-4o Vision API |
| **분석 항목** | 음식 종류, 예상 나트륨, 예상 칼로리 |
| **피드백 형태** | |

```
📸 "김치찌개" 인식됨

💬 피드백:
"나트륨이 좀 높을 수 있어요.
 국물은 조금만 드시면 좋겠어요!"

✅ 50 포인트 적립!
```

| **예외 케이스** | 음식 인식 실패 → "어떤 음식인지 알려주세요" (텍스트 입력) |

### 4.2 운동양갱 - 일일 미션

#### 기능: 일일 미션 체크리스트
| 항목 | 내용 |
|------|------|
| **목적** | 간단한 건강 활동 습관화 |
| **사용자 유형** | 일반 사용자 (User) |
| **화면** | 운동양갱 > "오늘의 미션" |

```
┌─────────────────────────────────────┐
│  🎯 오늘의 미션 (2/3 완료)          │
├─────────────────────────────────────┤
│  ☑️ 아침 스트레칭 10분    +10점     │
│  ☑️ 물 8잔 마시기        +10점     │
│  ⬜ 저녁 산책 30분       +10점     │
├─────────────────────────────────────┤
│  오늘 획득: 20점 | 누적: 1,250점    │
└─────────────────────────────────────┘
```

| **입력** | 미션 옆 체크박스 탭 |
| **출력** | 즉시 체크 + 포인트 반영 + 축하 애니메이션 |
| **예외 케이스** | 이미 완료된 미션 → 다시 체크 해제 불가 |

#### 기능: 미션 설정 (코치)
| 항목 | 내용 |
|------|------|
| **목적** | 회원별 맞춤 미션 설정 |
| **사용자 유형** | 코치 (Coach) |
| **화면** | 코치 대시보드 > 회원 상세 > "미션 설정" |
| **입력** | 미션 내용, 포인트 값 |
| **출력** | 다음 날부터 회원에게 적용 |

### 4.3 포인트 & 연속 달성

#### 기능: 포인트 시스템
| 항목 | 내용 |
|------|------|
| **적립 기준** | |

| 활동 | 포인트 |
|------|--------|
| 미션 완료 | 10점/개 |
| 음식 기록 | 50점/회 |
| 7일 연속 달성 | 100점 보너스 |
| 30일 연속 달성 | 500점 보너스 |

| **사용처** | 커머스 할인 쿠폰 교환 |

#### 기능: 주간 요약 리포트
| 항목 | 내용 |
|------|------|
| **목적** | 한 주간 활동 정리 |
| **발송 시점** | 매주 일요일 오후 8시 |
| **내용** | |

```
📊 이번 주 활동 요약

🎯 미션: 18/21 완료 (86%)
🍽️ 식사 기록: 14회
🚶 걸음 수: 평균 5,200보
⭐ 획득 포인트: 420점

💪 잘하고 계세요! 
   다음 주도 화이팅!
```

---

## 5. Phase 3: 프리미엄 코칭 & 커머스

### 5.1 프리미엄 구독

#### 기능: 구독 플랜 안내
| 항목 | 내용 |
|------|------|
| **목적** | 프리미엄 기능 소개 및 결제 유도 |
| **화면** | 설정 > "프리미엄 구독" |

```
┌─────────────────────────────────────┐
│  ⭐ 프리미엄 혜택                    │
├─────────────────────────────────────┤
│  ✅ 1:1 전문 코치 배정               │
│  ✅ 주 1회 영상 코칭                 │
│  ✅ 맞춤 미션 설정                   │
│  ✅ 상세 건강 리포트                 │
│  ✅ 포인트 2배 적립                  │
├─────────────────────────────────────┤
│  월 49,000원                        │
│                                     │
│  [구독 시작하기]                     │
│                                     │
│  * 보호자님이 대신 결제할 수 있어요   │
└─────────────────────────────────────┘
```

#### 기능: 보호자 대리 결제
| 항목 | 내용 |
|------|------|
| **목적** | 자녀가 부모의 프리미엄 결제 |
| **사용자 유형** | 보호자 (Guardian) |
| **화면** | 보호자 앱 > "부모님 프리미엄 결제" |
| **입력** | 결제 수단 선택 (카카오페이/네이버페이/카드) |
| **출력** | 결제 완료, 부모 계정 프리미엄 전환 |
| **예외 케이스** | 결제 실패 → "결제에 실패했어요. 다시 시도해주세요" |

### 5.2 1:1 영상 코칭

#### 기능: 코치 일정 확인 및 예약
| 항목 | 내용 |
|------|------|
| **목적** | 코칭 세션 예약 |
| **사용자 유형** | 프리미엄 사용자 |
| **화면** | 프리미엄 > "코칭 예약" |

```
┌─────────────────────────────────────┐
│  📅 김코치님 가능 시간               │
├─────────────────────────────────────┤
│  1/20(월)  10:00 ✅ | 14:00 ✅       │
│  1/21(화)  10:00 ❌ | 14:00 ✅       │
│  1/22(수)  10:00 ✅ | 14:00 ✅       │
├─────────────────────────────────────┤
│  선택: 1/20(월) 10:00               │
│  [예약하기]                         │
└─────────────────────────────────────┘
```

| **입력** | 날짜/시간 선택 |
| **출력** | 예약 확정, 알림 발송 |
| **예외 케이스** | 이미 예약된 시간 → "다른 시간을 선택해주세요" |

#### 기능: 영상통화 진입
| 항목 | 내용 |
|------|------|
| **목적** | 코칭 세션 시작 |
| **화면** | 예약 시간 10분 전부터 "입장하기" 버튼 활성화 |
| **기술** | WebRTC (Agora SDK 또는 Twilio Video) |
| **예외 케이스** | - 연결 실패 → "연결이 불안정해요. 다시 시도해주세요" <br>- 코치 미접속 → "코치님이 곧 입장할 예정이에요" |

#### 기능: 세션 완료 처리
| 항목 | 내용 |
|------|------|
| **사용자 유형** | 코치 (Coach) |
| **화면** | 통화 종료 후 자동 팝업 |
| **입력** | 세션 메모 작성 (선택) |
| **출력** | 상태: "completed", 세션 기록 저장 |

### 5.3 커머스 - 맞춤 상품 추천

#### 기능: 상품 추천
| 항목 | 내용 |
|------|------|
| **목적** | 건강 상태 기반 상품 추천 |
| **로직** | user.health_tags ↔ product.health_tags 매칭 |
| **예시** | health_tags: ["high_bp"] → "저염 밀키트" 추천 |

#### 기능: 포인트 할인
| 항목 | 내용 |
|------|------|
| **교환 비율** | 1,000 포인트 = 1,000원 할인 |
| **최대 할인** | 상품가의 30% |

---

## 6. 관리 시스템

### 6.1 코치 웹 대시보드

#### 화면: 담당 회원 리스트
```
┌─────────────────────────────────────────────────────────────┐
│  👨‍⚕️ 김코치님의 대시보드                    [로그아웃]      │
├─────────────────────────────────────────────────────────────┤
│  📋 담당 회원 (12명)                        [검색...]       │
├──────┬──────────┬──────────┬──────────┬───────────────────┤
│ 이름  │ 건강상태  │ 미션달성  │ 최근활동  │ 액션             │
├──────┼──────────┼──────────┼──────────┼───────────────────┤
│ 홍길동 │ 🟡 주의  │ 85%     │ 오늘     │ [상세] [영상통화] │
│ 김영희 │ 🟢 양호  │ 92%     │ 어제     │ [상세] [영상통화] │
│ 박철수 │ 🔴 관리  │ 45%     │ 3일전    │ [상세] [영상통화] │
└──────┴──────────┴──────────┴──────────┴───────────────────┘
```

#### 화면: 회원 상세
```
┌─────────────────────────────────────────────────────────────┐
│  👤 홍길동님 상세                           [← 목록으로]    │
├─────────────────────────────────────────────────────────────┤
│  기본정보        │  건강검진 요약        │  이번 주 활동    │
│  • 58세, 남      │  • 혈압: 130/85 🟡    │  • 미션: 6/7    │
│  • 프리미엄      │  • 혈당: 126 🔴       │  • 식사기록: 14 │
│  • 연결: 김자녀   │  • 콜레스테롤: 정상   │  • 포인트: 420  │
├─────────────────────────────────────────────────────────────┤
│  💬 코멘트 작성                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 혈당 관리에 좀 더 신경 써주시면 좋겠어요...          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                              [저장]         │
├─────────────────────────────────────────────────────────────┤
│  🎯 미션 설정 (내일부터 적용)                               │
│  ☑️ 아침 스트레칭 10분 (10점)                               │
│  ☑️ 물 8잔 마시기 (10점)                                    │
│  ☑️ 저녁 산책 30분 (10점)                                   │
│  [+ 미션 추가]                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 관리자 웹 대시보드

#### 화면: 대시보드 메인
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 관리자 대시보드                                         │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  전체 회원    │  프리미엄    │  코치       │  검토 대기    │
│  1,234명     │  156명      │  8명        │  23건         │
├──────────────┴──────────────┴──────────────┴───────────────┤
│  📊 오늘 활동                                               │
│  • 신규 가입: 12명                                          │
│  • 건강검진 업로드: 34건                                     │
│  • 미션 완료율: 78%                                         │
│  • 매출: ₩2,450,000                                        │
└─────────────────────────────────────────────────────────────┘
```

#### 기능 목록
| 메뉴 | 기능 |
|------|------|
| 사용자 관리 | 전체 사용자 조회/검색, 상태 변경, 프리미엄 수동 부여 |
| 코치 관리 | 코치 계정 생성, 담당 회원 배정, 성과 확인 |
| 건강검진 승인 | AI 분석 결과 검토, 최종 승인/반려 |
| 상품 관리 | 상품 등록/수정, 태그 설정, 재고 관리 |
| 포인트 정책 | 적립 기준 설정, 프로모션 설정 |
| 통계 | 가입자 추이, 매출, 활동률 차트 |

---

## 7. 기술 아키텍처

### 7.1 플랫폼 구성
| 구분 | 기술 | 비고 |
|------|------|------|
| **고객 앱** | React (웹) + PWA/Capacitor | iOS/Android 동시 지원 |
| **코치/관리자** | React (웹) | PC 브라우저 최적화 |
| **Backend** | Supabase | PostgreSQL, Auth, Storage, Edge Functions |
| **AI** | OpenAI GPT-4o Vision | 건강검진 OCR, 음식 분석 |
| **결제** | PortOne (Toss Payments) | 카카오페이, 네이버페이, 카드 |
| **영상통화** | Agora SDK | WebRTC 기반 |

### 7.2 주요 API 흐름

#### 건강검진 업로드 → 결과 표시
```
[사용자] 이미지 업로드
    ↓
[Supabase Storage] 이미지 저장
    ↓
[Edge Function] GPT-4o Vision 분석
    ↓
[DB] health_records 생성 (status: pending)
    ↓
[코치 대시보드] 알림 표시
    ↓
[코치] 검토 + 코멘트
    ↓
[DB] status: completed, coach_comment 저장
    ↓
[사용자] 푸시 알림 "결과가 나왔어요"
    ↓
[사용자] 건강 리포트 화면 표시
```

#### 보호자 연결 플로우
```
[부모] "보호자 연결" 메뉴
    ↓
[시스템] 6자리 코드 생성 (24시간 유효)
    ↓
[부모 → 자녀] 코드 전달 (카카오톡 등)
    ↓
[보호자 앱] 코드 입력
    ↓
[DB] guardian_connections 생성
    ↓
[보호자] 부모 건강 데이터 접근 가능
```

### 7.3 권한 체크 방식

| 기능 | User | Guardian | Coach | Admin |
|------|:----:|:--------:|:-----:|:-----:|
| 본인 건강 데이터 | ✅ | - | - | ✅ |
| 연결된 부모 데이터 | - | ✅ | - | ✅ |
| 담당 회원 데이터 | - | - | ✅ | ✅ |
| 미션 설정 | - | - | ✅ | ✅ |
| 건강검진 승인 | - | - | ✅ | ✅ |
| 코치 계정 관리 | - | - | - | ✅ |
| 상품 관리 | - | - | - | ✅ |

---

## 8. 데이터베이스 스키마

### 8.1 인증 & 사용자

```sql
-- 사용자 유형 ENUM
CREATE TYPE user_type AS ENUM ('user', 'guardian', 'coach', 'admin');
CREATE TYPE subscription_tier AS ENUM ('basic', 'premium');

-- 프로필 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  phone TEXT,
  user_type user_type NOT NULL DEFAULT 'user',
  subscription_tier subscription_tier DEFAULT 'basic',
  current_points INTEGER DEFAULT 0,
  assigned_coach_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보호자 연결
CREATE TABLE guardian_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_code TEXT,
  code_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, guardian_id)
);
```

### 8.2 건강 데이터

```sql
CREATE TYPE health_record_status AS ENUM ('uploading', 'analyzing', 'pending_review', 'completed', 'rejected');

CREATE TABLE health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_image_urls TEXT[] NOT NULL,
  parsed_data JSONB,
  health_tags TEXT[],
  health_age INTEGER,
  status health_record_status DEFAULT 'uploading',
  coach_comment TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 일일 활동

```sql
CREATE TYPE daily_log_type AS ENUM ('food', 'mission');

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type daily_log_type NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  ai_feedback TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 미션 템플릿 (코치가 설정)
CREATE TABLE mission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 포인트 내역
CREATE TABLE point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.4 코칭

```sql
CREATE TYPE coaching_session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status coaching_session_status DEFAULT 'scheduled',
  video_room_id TEXT,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 코치 가용 시간
CREATE TABLE coach_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE
);
```

### 8.5 커머스

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  health_tags TEXT[],
  image_url TEXT,
  purchase_link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  points_used INTEGER DEFAULT 0,
  final_price INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.6 결제

```sql
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES profiles(id),  -- 실제 결제자 (보호자 가능)
  plan_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  payer_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  status payment_status DEFAULT 'pending',
  payment_key TEXT,  -- PG사 결제키
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 부록: 에러 메시지 가이드 (고령자 UX)

| 상황 | 메시지 (존댓말) |
|------|----------------|
| 네트워크 오류 | "인터넷 연결이 불안정해요. 잠시 후 다시 시도해주세요." |
| 로그인 실패 | "로그인에 실패했어요. 다시 한번 시도해주세요." |
| 이미지 인식 실패 | "사진이 잘 안 보여요. 더 밝은 곳에서 다시 찍어주세요." |
| 권한 없음 | "이 기능은 프리미엄 회원만 사용할 수 있어요." |
| 일반 오류 | "문제가 생겼어요. 고객센터로 연락주세요." |
