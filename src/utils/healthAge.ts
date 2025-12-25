// healthAge.ts (v3.3 - integer output + no gauge)
// 결정론(동일 입력=동일 결과) 보장: 랜덤/Date.now/세션/temperature 등 사용 금지
// ✅ healthAge 숫자 계산은 오직 이 파일에서만 수행
// ✅ AI는 debug 기반으로 설명 텍스트만 생성 (숫자 계산/추정 금지)

export type Gender = "male" | "female";

export type HealthAgeInput = {
  // required
  actualAge: number; // 10~99
  gender: Gender;
  // InBody-extracted (as-is)
  heightCm?: number;
  weightKg?: number;
  bodyFatPercent: number; // %
  visceralFatLevel: number; // InBody scale
  // muscle
  ffmKg?: number; // Fat Free Mass (kg) - preferred if available
  smmKg?: number; // Skeletal Muscle Mass (kg)
  smi?: number; // Skeletal Muscle Mass Index (kg/m^2)
  // If you already have InBody "표준이상" 판정 값, pass it.
  // If undefined, we fall back to internal tables (deterministic).
  muscleAboveStandard?: boolean;
};

export type HealthAgeResult = {
  // ✅ UI/저장/표시는 healthAge만 사용 (정수)
  healthAge: number; // final, integer
  // athletic boolean (절대 보호에 사용)
  isAthletic: boolean;
  // AI는 debug만 사용해 설명 (숫자 계산 금지)
  debug: {
    athleticScore: number; // 0..1 continuous
    components: { bfScore: number; vfScore: number; muscleScore: number };
    metabolicRatio: number;
    expectedFfmKg: number | null;
    metabolicAgeRaw: number;
    adjustments: {
      athleticBonus: number; // years subtracted (0..ATHLETIC_BONUS_YEARS)
      fatPenalty: number; // years added (0..6)
      visceralPenalty: number; // years added (0..6)
    };
    clampedRange: { min: number; max: number };
  };
};

/* -----------------------------
 * 정책 상수 (필요 시 여기만 조정)
 * ----------------------------- */
const AGE_MIN = 10;
const AGE_MAX = 99;
// UX 안전 클램프: actualAge ± 7 (정책 고정)
const UX_CLAMP_DELTA = 7;
// 운동형(절대 보호) 판정 기준 - boolean (2/3)
// "연속 점수"는 athleticScore로 별도 계산
const BODY_FAT_LOW: Record<Gender, number> = { male: 15, female: 25 };
const VISCERAL_FAT_LOW = 6;
// v2 유지: 운동형이면 최대 -10년까지 젊게 (연속 점수로 0~10 보정)
const ATHLETIC_BONUS_YEARS = 10;
// metabolicRatio 영향 완만화 (과도한 젊음/노화 방지)
const RATIO_EXPONENT = 0.8;
// 기대 FFM 키 보정 기준(성별별 대표키)
const REF_HEIGHT: Record<Gender, number> = { male: 175, female: 162 };
// 키 보정 한계(과도한 보정 방지)
const HEIGHT_FACTOR_MIN = 0.9;
const HEIGHT_FACTOR_MAX = 1.1;

/* -----------------------------
 * 내부 테이블 (상수화)
 * muscleAboveStandard fallback
 * 1) input.muscleAboveStandard 최우선
 * 2) SMI 기준
 * 3) height + SMM 테이블
 * ----------------------------- */
const SMI_STANDARD_MIN: Record<Gender, number> = {
  male: 8.5,
  female: 6.0,
};

// (선택) 키 구간별 SMM 표준 최소치(kg)
const SMM_STANDARD_MIN_BY_HEIGHT: Record<
  Gender,
  Array<{ maxHeightCm: number; minSmmKg: number }>
> = {
  male: [
    { maxHeightCm: 165, minSmmKg: 30.0 },
    { maxHeightCm: 175, minSmmKg: 33.0 },
    { maxHeightCm: 185, minSmmKg: 36.0 },
    { maxHeightCm: 999, minSmmKg: 39.0 },
  ],
  female: [
    { maxHeightCm: 155, minSmmKg: 19.0 },
    { maxHeightCm: 165, minSmmKg: 21.0 },
    { maxHeightCm: 175, minSmmKg: 23.0 },
    { maxHeightCm: 999, minSmmKg: 25.0 },
  ],
};

/* -----------------------------
 * FFM 기대치 테이블 (상수화)
 * expectedFFM(age, gender) + (optional) height factor
 * ----------------------------- */
const EXPECTED_FFM_BY_AGE: Record<
  Gender,
  Array<{ maxAge: number; expectedFfmKg: number }>
> = {
  male: [
    { maxAge: 19, expectedFfmKg: 54 },
    { maxAge: 24, expectedFfmKg: 56 },
    { maxAge: 29, expectedFfmKg: 57 },
    { maxAge: 34, expectedFfmKg: 56 },
    { maxAge: 39, expectedFfmKg: 55 },
    { maxAge: 44, expectedFfmKg: 54 },
    { maxAge: 49, expectedFfmKg: 52 },
    { maxAge: 54, expectedFfmKg: 51 },
    { maxAge: 59, expectedFfmKg: 50 },
    { maxAge: 64, expectedFfmKg: 48 },
    { maxAge: 69, expectedFfmKg: 47 },
    { maxAge: 99, expectedFfmKg: 45 },
  ],
  female: [
    { maxAge: 19, expectedFfmKg: 40 },
    { maxAge: 24, expectedFfmKg: 41 },
    { maxAge: 29, expectedFfmKg: 41 },
    { maxAge: 34, expectedFfmKg: 40 },
    { maxAge: 39, expectedFfmKg: 39 },
    { maxAge: 44, expectedFfmKg: 38 },
    { maxAge: 49, expectedFfmKg: 37 },
    { maxAge: 54, expectedFfmKg: 36 },
    { maxAge: 59, expectedFfmKg: 35 },
    { maxAge: 64, expectedFfmKg: 34 },
    { maxAge: 69, expectedFfmKg: 33 },
    { maxAge: 99, expectedFfmKg: 32 },
  ],
};

/* -----------------------------
 * utils (deterministic)
 * ----------------------------- */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ✅ 요구사항: 최종 healthAge는 정수 (마지막 반올림)
function roundForDisplay(x: number): number {
  return Math.round(x);
}

function safeNumber(n: unknown): number | undefined {
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

// ramp: good(=best) -> 1, bad(=worst) -> 0 (linear)
function rampDown(x: number, good: number, bad: number): number {
  if (x <= good) return 1;
  if (x >= bad) return 0;
  return 1 - (x - good) / (bad - good);
}

// ramp: bad -> 0, good -> 1 (linear)
function rampUp(x: number, bad: number, good: number): number {
  if (x <= bad) return 0;
  if (x >= good) return 1;
  return (x - bad) / (good - bad);
}

function pickExpectedFfmBase(gender: Gender, age: number): number {
  const row = EXPECTED_FFM_BY_AGE[gender].find((r) => age <= r.maxAge);
  return (
    row?.expectedFfmKg ??
    EXPECTED_FFM_BY_AGE[gender][EXPECTED_FFM_BY_AGE[gender].length - 1]
      .expectedFfmKg
  );
}

function expectedFfmWithHeight(
  gender: Gender,
  age: number,
  heightCm?: number
): number {
  const base = pickExpectedFfmBase(gender, age);
  if (!safeNumber(heightCm)) return base;
  const factor = clamp(
    heightCm! / REF_HEIGHT[gender],
    HEIGHT_FACTOR_MIN,
    HEIGHT_FACTOR_MAX
  );
  return base * factor;
}

/* -----------------------------
 * muscleAboveStandard 판단용 fallback
 * ----------------------------- */
function computeMuscleAboveStandard(input: HealthAgeInput): boolean {
  // 1) InBody 판정값 있으면 최우선
  if (typeof input.muscleAboveStandard === "boolean")
    return input.muscleAboveStandard;
  // 2) SMI 기준
  if (typeof input.smi === "number" && Number.isFinite(input.smi)) {
    return input.smi >= SMI_STANDARD_MIN[input.gender];
  }
  // 3) 키+SMM 테이블
  if (
    typeof input.heightCm === "number" &&
    Number.isFinite(input.heightCm) &&
    typeof input.smmKg === "number" &&
    Number.isFinite(input.smmKg)
  ) {
    const rows = SMM_STANDARD_MIN_BY_HEIGHT[input.gender];
    const row =
      rows.find((r) => input.heightCm! <= r.maxHeightCm) ?? rows[rows.length - 1];
    return input.smmKg >= row.minSmmKg;
  }
  // 정보 부족하면 보수적으로 false
  return false;
}

/* -----------------------------
 * 운동형 boolean(절대 보호) 판정: 3개 중 2개 이상
 * ----------------------------- */
export function computeIsAthletic(input: HealthAgeInput): boolean {
  const bfLow = input.bodyFatPercent <= BODY_FAT_LOW[input.gender];
  const vfLow = input.visceralFatLevel <= VISCERAL_FAT_LOW;
  const muscleHigh = computeMuscleAboveStandard(input);
  const satisfied = [bfLow, vfLow, muscleHigh].filter(Boolean).length;
  return satisfied >= 2;
}

/* -----------------------------
 * 연속 점수(0~1) 산출
 * - 컷오프를 "구간 램프"로 부드럽게
 * ----------------------------- */
function computeContinuousScores(input: HealthAgeInput): {
  bfScore: number;
  vfScore: number;
  muscleScore: number;
  athleticScore: number;
} {
  const { gender } = input;
  // 체지방 점수: (낮을수록 좋음)
  // 남: 12% 이하=1, 20% 이상=0 / 여: 22% 이하=1, 30% 이상=0
  const bfScore =
    gender === "male"
      ? rampDown(input.bodyFatPercent, 12, 20)
      : rampDown(input.bodyFatPercent, 22, 30);
  // 내장지방 점수: 4 이하=1, 10 이상=0
  const vfScore = rampDown(input.visceralFatLevel, 4, 10);
  // 근육 점수:
  // - InBody 표준이상 있으면 1/0 고정
  // - 없으면 SMI 기준 주변에서 부드럽게 (std-0.5=0 ~ std+0.5=1)
  // - SMI도 없고 판정도 없으면, muscleAboveStandard fallback(boolean) 결과를 1/0로 사용
  let muscleScore = 0;
  if (typeof input.muscleAboveStandard === "boolean") {
    muscleScore = input.muscleAboveStandard ? 1 : 0;
  } else if (typeof input.smi === "number" && Number.isFinite(input.smi)) {
    const std = SMI_STANDARD_MIN[gender];
    muscleScore = rampUp(input.smi, std - 0.5, std + 0.5);
  } else {
    muscleScore = computeMuscleAboveStandard(input) ? 1 : 0;
  }
  const athleticScore = clamp((bfScore + vfScore + muscleScore) / 3, 0, 1);
  return { bfScore, vfScore, muscleScore, athleticScore };
}

/* -----------------------------
 * 연속 페널티 (0~6 years)
 * - "과체지방/고내장지방"일수록 점진적으로 증가
 * ----------------------------- */
function fatPenaltyYearsContinuous(gender: Gender, bf: number): number {
  const start = BODY_FAT_LOW[gender]; // 여기부터 페널티가 0→증가
  const worst = gender === "male" ? 35 : 40;
  if (bf <= start) return 0;
  return clamp(((bf - start) / (worst - start)) * 6, 0, 6);
}

function visceralPenaltyYearsContinuous(vf: number): number {
  const start = VISCERAL_FAT_LOW; // 6
  const worst = 15;
  if (vf <= start) return 0;
  return clamp(((vf - start) / (worst - start)) * 6, 0, 6);
}

/* -----------------------------
 * 메인 함수
 * ----------------------------- */
export function computeHealthAge(input: HealthAgeInput): HealthAgeResult {
  // ----- validation (정책 고정) -----
  if (!Number.isFinite(input.actualAge))
    throw new Error("actualAge is required");
  if (input.actualAge < AGE_MIN || input.actualAge > AGE_MAX) {
    throw new Error(`actualAge must be between ${AGE_MIN} and ${AGE_MAX}`);
  }
  if (input.gender !== "male" && input.gender !== "female")
    throw new Error("gender is required");
  if (!Number.isFinite(input.bodyFatPercent))
    throw new Error("bodyFatPercent is required");
  if (!Number.isFinite(input.visceralFatLevel))
    throw new Error("visceralFatLevel is required");

  const actualAge = input.actualAge;
  const gender = input.gender;
  const minClamp = actualAge - UX_CLAMP_DELTA;
  const maxClamp = actualAge + UX_CLAMP_DELTA;

  // boolean athletic (절대 보호)
  const isAthletic = computeIsAthletic(input);

  // continuous scores (연속) - debug/보정 계산에 사용
  const { bfScore, vfScore, muscleScore, athleticScore } =
    computeContinuousScores(input);

  // ----- FFM 산출 (FFM 우선; 없으면 weight/bodyFatPercent 근사) -----
  const ffm =
    safeNumber(input.ffmKg) ??
    (safeNumber(input.weightKg) != null
      ? input.weightKg! * (1 - input.bodyFatPercent / 100)
      : undefined);

  // ✅ (D) FFM 부족 케이스: gauge 없이 "정수" 반환
  if (ffm == null || ffm <= 0) {
    const base = roundForDisplay(clamp(actualAge, minClamp, maxClamp));
    return {
      healthAge: base,
      isAthletic,
      debug: {
        athleticScore,
        components: { bfScore, vfScore, muscleScore },
        metabolicRatio: 1,
        expectedFfmKg: null,
        metabolicAgeRaw: actualAge,
        adjustments: { athleticBonus: 0, fatPenalty: 0, visceralPenalty: 0 },
        clampedRange: { min: minClamp, max: maxClamp },
      },
    };
  }

  // ----- metabolicRatio (FFM 기반) -----
  const expectedFfmKg = expectedFfmWithHeight(gender, actualAge, input.heightCm);
  const metabolicRatio = ffm / expectedFfmKg;
  // ratio가 클수록(제지방 많을수록) 젊게.
  // 단, 너무 과하게 흔들리지 않도록 exponent로 완만화
  const ratioClamped = clamp(metabolicRatio, 0.7, 1.5);
  const metabolicAgeRaw = actualAge / Math.pow(ratioClamped, RATIO_EXPONENT);

  // ----- adjustments (continuous) -----
  // 운동형 bonus는 "boolean"이 아니라 "연속 점수"로 0~10년
  const athleticBonus = ATHLETIC_BONUS_YEARS * athleticScore;
  const fatPenalty = fatPenaltyYearsContinuous(gender, input.bodyFatPercent);
  const visceralPenalty = visceralPenaltyYearsContinuous(input.visceralFatLevel);
  const healthAgeRaw =
    metabolicAgeRaw - athleticBonus + fatPenalty + visceralPenalty;

  // ✅ (C) 최종 확정 순서: clamp -> round(int) -> athletic 보호(최종 우선)
  let healthAge = clamp(healthAgeRaw, minClamp, maxClamp); // clamp 먼저
  healthAge = roundForDisplay(healthAge); // 마지막에 정수 반올림

  // 운동형 절대 보호 (최종 우선)
  if (isAthletic) {
    healthAge = Math.min(healthAge, Math.round(actualAge));
  }

  return {
    healthAge,
    isAthletic,
    debug: {
      athleticScore,
      components: { bfScore, vfScore, muscleScore },
      metabolicRatio,
      expectedFfmKg,
      metabolicAgeRaw,
      adjustments: { athleticBonus, fatPenalty, visceralPenalty },
      clampedRange: { min: minClamp, max: maxClamp },
    },
  };
}
