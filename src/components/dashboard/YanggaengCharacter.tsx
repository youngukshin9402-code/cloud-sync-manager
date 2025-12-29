import { useState, useEffect, useMemo } from "react";

interface YanggaengCharacterProps {
  achievementCount: number; // 0-4
}

// 스케일 정규화 (3단계 기준)
// 에셋 내 양갱 본체 크기가 다르므로 시각적으로 동일하게 보이도록 조정
const SCALE_FACTORS: Record<number, number> = {
  1: 1.08,  // 1단계 양갱이 작아서 확대
  2: 1.04,  // 2단계 약간 확대
  3: 1.0,   // 3단계 = 기준
  4: 1.0,   // 4단계 동일
  5: 0.96,  // 5단계 약간 축소
};

export default function YanggaengCharacter({ achievementCount }: YanggaengCharacterProps) {
  // 달성 개수 → 단계 매핑 (0개=1단계, 4개=5단계)
  const stage = useMemo(() => {
    return Math.min(Math.max(achievementCount + 1, 1), 5);
  }, [achievementCount]);

  const [displayedStage, setDisplayedStage] = useState(stage);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 상태 전환 애니메이션
  useEffect(() => {
    if (stage !== displayedStage) {
      setIsTransitioning(true);
      
      // 0.2초 후 이미지 교체
      const swapTimeout = setTimeout(() => {
        setDisplayedStage(stage);
      }, 200);

      // 0.5초 후 전환 완료
      const endTimeout = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);

      return () => {
        clearTimeout(swapTimeout);
        clearTimeout(endTimeout);
      };
    }
  }, [stage, displayedStage]);

  const scaleFactor = SCALE_FACTORS[displayedStage] || 1.0;
  const imageSrc = `/yanggaeng/stage-${displayedStage}.png`;

  return (
    <div className="flex justify-center items-center py-4">
      <div 
        className="relative w-[120px] h-[120px] flex items-center justify-center"
        style={{
          // 전환 애니메이션
          transform: isTransitioning 
            ? 'scale(0.95)' 
            : 'scale(1)',
          transition: 'transform 0.2s ease-out',
        }}
      >
        <img
          src={imageSrc}
          alt={`영양갱 ${displayedStage}단계`}
          className="animate-yanggaeng-float"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${scaleFactor})`,
            // 전환 시 bounce 효과
            animation: isTransitioning 
              ? 'none' 
              : undefined,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
