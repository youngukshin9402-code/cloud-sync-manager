import { useEffect, useState, useMemo } from 'react';
import stage1 from '@/assets/yanggaeng-stage-1.png';
import stage2 from '@/assets/yanggaeng-stage-2.png';
import stage3 from '@/assets/yanggaeng-stage-3.png';
import stage4 from '@/assets/yanggaeng-stage-4.png';
import stage5 from '@/assets/yanggaeng-stage-5.png';

interface YanggaengCharacterProps {
  achievementCount: number; // 0-4
}

// 3단계 기준으로 각 스테이지별 스케일 보정값 (bbox 기반 정규화)
// 실제 PNG 내 양갱 본체 크기 차이를 보정
const STAGE_SCALE_FACTORS: Record<number, number> = {
  1: 1.15,  // 1단계는 실제로 작아서 확대
  2: 1.08,  // 2단계도 약간 작음
  3: 1.0,   // 3단계가 기준
  4: 0.95,  // 4단계는 약간 큼
  5: 0.85,  // 5단계는 더 큼
};

const STAGE_IMAGES = [stage1, stage2, stage3, stage4, stage5];

// 단계별 idle 애니메이션 설정
const IDLE_ANIMATIONS: Record<number, { 
  translateY: string; 
  duration: string;
  hasWobble?: boolean;
  hasSparkle?: boolean;
  sparkleCount?: number;
  sparkleDuration?: string;
}> = {
  1: { translateY: '3px', duration: '4.5s' },
  2: { translateY: '4px', duration: '3.5s' },
  3: { translateY: '7px', duration: '2.75s' },
  4: { translateY: '10px', duration: '2s', hasWobble: true, hasSparkle: true, sparkleCount: 2, sparkleDuration: '7s' },
  5: { translateY: '13px', duration: '1.65s', hasWobble: true, hasSparkle: true, sparkleCount: 3, sparkleDuration: '5s' },
};

export default function YanggaengCharacter({ achievementCount }: YanggaengCharacterProps) {
  // 0-4 달성 → 1-5 단계
  const targetStage = Math.min(5, Math.max(1, achievementCount + 1));
  
  const [currentStage, setCurrentStage] = useState(targetStage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayStage, setDisplayStage] = useState(targetStage);

  // 상태 전환 애니메이션
  useEffect(() => {
    if (targetStage !== currentStage && !isTransitioning) {
      setIsTransitioning(true);
      
      // 0.25초 후 이미지 교체
      const swapTimer = setTimeout(() => {
        setDisplayStage(targetStage);
      }, 250);
      
      // 0.55초 후 전환 완료
      const completeTimer = setTimeout(() => {
        setCurrentStage(targetStage);
        setIsTransitioning(false);
      }, 550);
      
      return () => {
        clearTimeout(swapTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [targetStage, currentStage, isTransitioning]);

  const stageImage = STAGE_IMAGES[displayStage - 1];
  const scaleFactor = STAGE_SCALE_FACTORS[displayStage];
  const idleConfig = IDLE_ANIMATIONS[displayStage];

  // 반짝이 위치 (랜덤하지만 메모이즈)
  const sparklePositions = useMemo(() => {
    const positions: { top: string; left: string; delay: string }[] = [];
    const count = idleConfig.sparkleCount || 0;
    for (let i = 0; i < count; i++) {
      positions.push({
        top: `${10 + Math.random() * 20}%`,
        left: `${10 + i * 35 + Math.random() * 20}%`,
        delay: `${i * 1.5}s`,
      });
    }
    return positions;
  }, [displayStage, idleConfig.sparkleCount]);

  return (
    <div className="relative flex items-center justify-center" style={{ height: '100px', width: '100px' }}>
      {/* 반짝이 효과 (4, 5단계) */}
      {idleConfig.hasSparkle && sparklePositions.map((pos, i) => (
        <div
          key={i}
          className="absolute text-yellow-400 pointer-events-none"
          style={{
            top: pos.top,
            left: pos.left,
            animation: `sparkle ${idleConfig.sparkleDuration} ease-in-out ${pos.delay} infinite`,
            fontSize: '14px',
          }}
        >
          ✦
        </div>
      ))}
      
      {/* 캐릭터 이미지 */}
      <div
        className="relative"
        style={{
          width: `${80 * scaleFactor}px`,
          height: `${80 * scaleFactor}px`,
          animation: isTransitioning 
            ? 'characterTransition 0.55s ease-out'
            : `yanggaengIdle${displayStage} ${idleConfig.duration} ease-in-out infinite${idleConfig.hasWobble ? `, yanggaengWobble ${idleConfig.duration} ease-in-out infinite` : ''}`,
        }}
      >
        <img
          src={stageImage}
          alt={`영양갱 ${displayStage}단계`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes yanggaengIdle1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes yanggaengIdle2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes yanggaengIdle3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes yanggaengIdle4 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes yanggaengIdle5 {
          0%, 100% { transform: translateY(0) scaleY(1) scaleX(1); }
          25% { transform: translateY(-6px) scaleY(1.02) scaleX(0.98); }
          50% { transform: translateY(-13px) scaleY(0.98) scaleX(1.02); }
          75% { transform: translateY(-6px) scaleY(1.02) scaleX(0.98); }
        }
        @keyframes yanggaengWobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1.5deg); }
          75% { transform: rotate(1.5deg); }
        }
        @keyframes characterTransition {
          0% { transform: scale(1); }
          45% { transform: scale(0.85); }
          50% { transform: scale(0.85); }
          100% { transform: scale(1.05); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
