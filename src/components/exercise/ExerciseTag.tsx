/**
 * 공용 운동명 태그 컴포넌트
 * 모든 화면에서 동일한 스타일(컬러 filled)로 렌더링됩니다.
 * - 해시 기반 색상 매핑: 동일 운동명은 항상 동일 색상
 * - 인덱스 기반 색상 옵션도 지원
 * - xs: 카드 전용 소형 태그
 * - sm/md: 팝업/상세 화면용
 */

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// 운동명별 색상 팔레트 (파스텔 톤, filled 스타일)
const EXERCISE_TAG_COLORS = [
  "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30",
  "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30",
  "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
  "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
];

// 해시 함수: 문자열을 숫자로 변환
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// 운동명 기반 색상 (해시 기반 - 동일 이름은 항상 동일 색상)
export function getExerciseTagColor(name: string): string {
  const hash = hashString(name);
  return EXERCISE_TAG_COLORS[hash % EXERCISE_TAG_COLORS.length];
}

// 인덱스 기반 색상 (순서 보장)
export function getExerciseTagColorByIndex(index: number): string {
  return EXERCISE_TAG_COLORS[index % EXERCISE_TAG_COLORS.length];
}

interface ExerciseTagProps {
  name: string;
  index?: number; // 인덱스 기반 색상을 원할 경우 사용
  onRemove?: () => void;
  size?: "xs" | "sm" | "md"; // xs: 카드용 초소형
  className?: string;
}

export function ExerciseTag({ 
  name, 
  index,
  onRemove, 
  size = "sm",
  className 
}: ExerciseTagProps) {
  // 인덱스가 주어지면 인덱스 기반, 아니면 해시 기반 색상
  const colorClass = index !== undefined 
    ? getExerciseTagColorByIndex(index) 
    : getExerciseTagColor(name);
  
  // 사이즈별 스타일
  const sizeClass = {
    xs: "text-[10px] px-1.5 py-0.5 leading-tight", // 카드용 초소형
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border font-medium",
        // 핵심: 태그 내부 텍스트 줄바꿈 금지
        "whitespace-nowrap",
        sizeClass,
        colorClass,
        className
      )}
    >
      <span className="break-keep">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors shrink-0"
        >
          <X className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      )}
    </span>
  );
}

// "외 n개" 오버플로우 태그 (중립색, 카드 전용)
interface OverflowTagProps {
  count: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function OverflowTag({ count, size = "xs", className }: OverflowTagProps) {
  const sizeClass = {
    xs: "text-[10px] px-1.5 py-0.5 leading-tight",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap shrink-0",
        "bg-muted/50 text-muted-foreground border-muted-foreground/20",
        sizeClass,
        className
      )}
    >
      외 {count}개
    </span>
  );
}

// 태그 리스트 렌더링 헬퍼 컴포넌트 (팝업/상세용 - 전체 표시, wrap 허용)
interface ExerciseTagListProps {
  names: string[];
  onRemove?: (index: number) => void;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function ExerciseTagList({ 
  names, 
  onRemove, 
  size = "sm",
  className 
}: ExerciseTagListProps) {
  if (names.length === 0) return null;
  
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {names.map((name, i) => (
        <ExerciseTag
          key={i}
          name={name}
          index={i}
          onRemove={onRemove ? () => onRemove(i) : undefined}
          size={size}
        />
      ))}
    </div>
  );
}
