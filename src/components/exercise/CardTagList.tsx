/**
 * 운동 기록 카드 전용 태그 리스트
 * - 2줄 고정 높이
 * - 태그 단위 줄바꿈 (글자 단위 X)
 * - 초과 시 "외 n개" 태그 표시 (절대 잘리지 않음)
 * - ResizeObserver 기반 동적 측정
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { ExerciseTag, OverflowTag } from "./ExerciseTag";

interface CardTagListProps {
  names: string[];
  className?: string;
}

// 2줄 높이 (xs 태그 기준: 약 1.25rem * 2 + gap)
const MAX_HEIGHT = 44; // px

export function CardTagList({ names, className }: CardTagListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(names.length);
  const [measured, setMeasured] = useState(false);

  // 태그가 2줄 안에 들어가는지 측정
  const measureFit = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || names.length === 0) {
      setVisibleCount(names.length);
      setMeasured(true);
      return;
    }

    const containerWidth = container.offsetWidth;
    const tagElements = measure.querySelectorAll('[data-tag]');
    const overflowTag = measure.querySelector('[data-overflow]');
    
    if (tagElements.length === 0) {
      setVisibleCount(names.length);
      setMeasured(true);
      return;
    }

    const gap = 4; // gap-1 = 0.25rem = 4px
    const overflowWidth = overflowTag ? (overflowTag as HTMLElement).offsetWidth + gap : 60;
    
    let currentLineWidth = 0;
    let lineCount = 1;
    let fitCount = 0;
    let needsOverflow = false;

    // 모든 태그가 2줄에 들어가는지 먼저 확인
    for (let i = 0; i < tagElements.length; i++) {
      const tagWidth = (tagElements[i] as HTMLElement).offsetWidth;
      const widthWithGap = i === 0 ? tagWidth : tagWidth + gap;

      if (currentLineWidth + widthWithGap <= containerWidth) {
        currentLineWidth += widthWithGap;
      } else {
        lineCount++;
        currentLineWidth = tagWidth;
      }

      if (lineCount > 2) {
        needsOverflow = true;
        break;
      }
    }

    if (!needsOverflow) {
      // 모두 들어감
      setVisibleCount(names.length);
      setMeasured(true);
      return;
    }

    // 오버플로우 필요 - "외 n개" 태그 공간 확보하면서 계산
    currentLineWidth = 0;
    lineCount = 1;
    fitCount = 0;

    for (let i = 0; i < tagElements.length; i++) {
      const tagWidth = (tagElements[i] as HTMLElement).offsetWidth;
      const widthWithGap = i === 0 ? tagWidth : tagWidth + gap;
      
      // 현재 태그 + 오버플로우 태그가 들어갈 수 있는지 확인
      const remainingTags = names.length - i - 1;
      const needsOverflowAfterThis = remainingTags > 0;
      
      let testWidth = currentLineWidth + widthWithGap;
      if (needsOverflowAfterThis) {
        testWidth += overflowWidth;
      }

      // 현재 줄에 들어가는지 확인
      if (testWidth <= containerWidth) {
        currentLineWidth += widthWithGap;
        fitCount++;
      } else {
        // 다음 줄로
        lineCount++;
        
        if (lineCount > 2) {
          // 2줄 초과 - 여기서 멈추고 오버플로우 표시
          break;
        }
        
        // 다음 줄 시작
        currentLineWidth = tagWidth;
        
        // 다음 줄에서 오버플로우 태그 공간 확인
        if (needsOverflowAfterThis && currentLineWidth + overflowWidth > containerWidth) {
          // 오버플로우 태그만 들어갈 수 있으면 현재 태그도 제외
          break;
        }
        
        fitCount++;
      }
    }

    // 최소 1개는 표시 (오버플로우만 있으면 안됨)
    setVisibleCount(Math.max(1, Math.min(fitCount, names.length - 1)));
    setMeasured(true);
  }, [names]);

  // 초기 측정 및 리사이즈 감지
  useEffect(() => {
    setMeasured(false);
    
    // 약간의 딜레이 후 측정 (DOM 렌더링 완료 대기)
    const timer = setTimeout(() => {
      measureFit();
    }, 10);

    const container = containerRef.current;
    if (!container) return () => clearTimeout(timer);

    const resizeObserver = new ResizeObserver(() => {
      measureFit();
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [names, measureFit]);

  const displayTags = names.slice(0, visibleCount);
  const overflowCount = names.length - visibleCount;

  return (
    <div ref={containerRef} className={className}>
      {/* 숨겨진 측정용 컨테이너 */}
      <div
        ref={measureRef}
        className="absolute opacity-0 pointer-events-none flex flex-wrap gap-1"
        style={{ width: containerRef.current?.offsetWidth || '100%' }}
        aria-hidden="true"
      >
        {names.map((name, i) => (
          <span key={i} data-tag className="inline-block">
            <ExerciseTag name={name} index={i} size="xs" />
          </span>
        ))}
        <span data-overflow className="inline-block">
          <OverflowTag count={99} size="xs" />
        </span>
      </div>

      {/* 실제 표시되는 태그들 */}
      <div 
        className="flex flex-wrap gap-1 overflow-hidden"
        style={{ 
          maxHeight: `${MAX_HEIGHT}px`,
          opacity: measured ? 1 : 0,
          transition: 'opacity 0.1s'
        }}
      >
        {displayTags.map((name, i) => (
          <ExerciseTag key={`${name}-${i}`} name={name} index={i} size="xs" />
        ))}
        {overflowCount > 0 && (
          <OverflowTag count={overflowCount} size="xs" />
        )}
      </div>
    </div>
  );
}
