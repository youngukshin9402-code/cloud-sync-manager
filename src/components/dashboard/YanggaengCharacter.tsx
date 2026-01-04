import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface YanggaengCharacterProps {
  achievementCount: number; // 0-4
}

// 스케일 정규화 (3단계 기준) - 새 에셋은 크기가 균일하여 모두 1.0
const SCALE_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.0,
  4: 1.0,
  5: 1.0,
};

// 아침 문구 (06:00 ~ 17:59 KST)
const MORNING_MESSAGES = [
  "천천히 가도 괜찮아요. 건강은 마라톤이니까요!",
  "오늘도 내 몸을 챙기는 하루를 시작해볼까요?",
  "완벽하지 않아도 좋아요. 시작한 것만으로 충분해요!",
  "오늘의 작은 선택이 내일의 컨디션을 만들어요 😊",
  "무리하지 말고 지금 페이스 그대로 가요!",
  "오늘도 나를 아끼는 하루가 되길 응원해요 💛",
  "잘하려고 애쓰는 지금 이 순간이 이미 멋져요!",
  "오늘 하루도 내 몸 편에 서볼까요?",
  "어제보다 조금만 더 신경 쓰면 충분해요!",
  "오늘도 건강한 라이프스타일 한 걸음 시작이에요 🌱",
];

// 저녁 문구 (18:00 ~ 05:59 KST)
const EVENING_MESSAGES = [
  "오늘 하루도 수고했어요. 이 정도면 충분해요.",
  "완벽하지 않아도 괜찮은 하루였어요 😊",
  "오늘도 나를 챙기느라 고생 많았어요!",
  "잘한 점 하나쯤은 분명 있었을 거예요.",
  "오늘의 노력은 몸이 기억할 거예요 💪",
  "여기까지 온 것만 해도 정말 잘했어요.",
  "오늘 하루도 무사히 보낸 걸로 충분해요.",
  "내 몸을 생각한 오늘, 의미 있었어요.",
  "고생한 만큼 푹 쉬어도 되는 밤이에요 🌙",
  "오늘도 나를 포기하지 않은 하루였어요.",
];

// KST 기준 현재 시간대에 맞는 랜덤 문구 생성
const getRandomMessage = (): string => {
  const now = new Date();
  // KST는 UTC+9
  const kstHour = (now.getUTCHours() + 9) % 24;
  
  const isMorning = kstHour >= 6 && kstHour < 18;
  const messages = isMorning ? MORNING_MESSAGES : EVENING_MESSAGES;
  const randomIndex = Math.floor(Math.random() * messages.length);
  
  const dateStr = format(now, 'M월 d일', { locale: ko });
  return `${dateStr}, ${messages[randomIndex]}`;
};

export default function YanggaengCharacter({ achievementCount }: YanggaengCharacterProps) {
  // 달성 개수 → 단계 매핑 (0개=1단계, 4개=5단계)
  const stage = useMemo(() => {
    return Math.min(Math.max(achievementCount + 1, 1), 5);
  }, [achievementCount]);

  const [displayedStage, setDisplayedStage] = useState(stage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 컴포넌트 마운트 시 랜덤 문구 생성 (재진입 시 변경됨)
  const [message, setMessage] = useState(() => getRandomMessage());
  
  // 캐릭터 터치 시 새로운 랜덤 문구
  const handleCharacterClick = () => {
    setMessage(getRandomMessage());
  };

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
  const imageSrc = `/yanggaeng/stage-${displayedStage}.png?v=4`;

  return (
    <div className="flex flex-col items-center py-2">
      {/* 양갱 캐릭터 - 터치 시 새 문구 */}
      <div 
        className="relative w-[100px] h-[100px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        style={{
          transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.2s ease-out',
        }}
        onClick={handleCharacterClick}
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
            animation: isTransitioning ? 'none' : undefined,
          }}
          draggable={false}
        />
      </div>
      
      {/* 말풍선 */}
      <div className="speech-bubble mt-2 px-3 py-1.5 max-w-[200px]">
        <p className="text-xs text-center text-foreground leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
