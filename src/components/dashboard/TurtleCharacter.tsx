import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TurtleCharacterProps {
  achievementCount: 0 | 1 | 2 | 3 | 4;
}

const STATUS_MESSAGES: Record<number, string> = {
  0: "오늘은 좀 졸린 하루네… 천천히 가자",
  1: "오, 그래도 시작은 했어!",
  2: "딱 절반! 흐름 좋아",
  3: "거의 다 왔어! 조금만 더!",
  4: "완벽해! 오늘 최고야 🐢✨",
};

// 터치 반응 메시지
const TOUCH_MESSAGES = [
  "반가워! 🐢",
  "힘내자!",
  "오늘도 화이팅!",
  "같이 하자!",
  "고마워! 💚",
];

// 프리미엄 마스코트급 거북이 SVG 컴포넌트
function TurtleSVG({ 
  state, 
  isTouched,
  onTouchComplete 
}: { 
  state: 0 | 1 | 2 | 3 | 4;
  isTouched: boolean;
  onTouchComplete: () => void;
}) {
  const [blinkPhase, setBlinkPhase] = useState(0);
  const [touchScale, setTouchScale] = useState(1);
  
  // 눈 깜빡임 효과 - 상태별 다른 속도
  useEffect(() => {
    const getBlinkInterval = () => {
      switch(state) {
        case 0: return 4500; // 졸림 - 느린 깜빡임
        case 1: return 3500;
        case 2: return 3000;
        case 3: return 2500;
        case 4: return 2000; // 활발 - 빠른 깜빡임
        default: return 3000;
      }
    };
    
    const blinkInterval = setInterval(() => {
      setBlinkPhase(1);
      setTimeout(() => setBlinkPhase(0), 120);
    }, getBlinkInterval());
    
    return () => clearInterval(blinkInterval);
  }, [state]);

  // 터치 애니메이션
  useEffect(() => {
    if (isTouched) {
      setTouchScale(1.1);
      const timer = setTimeout(() => {
        setTouchScale(1);
        onTouchComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTouched, onTouchComplete]);

  // 상태별 눈 스타일
  const getEyeScaleY = () => {
    if (isTouched) return 0.7; // 터치 시 행복한 눈
    if (blinkPhase === 1) return 0.05;
    if (state === 0) return 0.4; // 졸린 눈
    if (state === 4) return 0.65; // 반달눈
    return 1;
  };

  // 상태별 입 경로
  const getMouthPath = () => {
    if (isTouched) return "M 85 108 Q 100 122 115 108"; // 터치 시 큰 미소
    switch(state) {
      case 0: return "M 90 106 Q 100 104 110 106"; // 졸린 입
      case 1: return "M 90 106 Q 100 110 110 106"; // 살짝 미소
      case 2: return "M 88 106 Q 100 114 112 106"; // 기본 미소
      case 3: return "M 85 105 Q 100 118 115 105"; // 활짝 미소
      case 4: return "M 82 105 Q 100 125 118 105"; // 매우 행복
      default: return "M 88 106 Q 100 114 112 106";
    }
  };

  // 상태별 바디 애니메이션 클래스
  const getBodyAnimation = () => {
    if (isTouched) return "animate-turtle-touch-bounce";
    switch (state) {
      case 0: return "animate-turtle-breathe-slow";
      case 1: return "animate-turtle-breathe";
      case 2: return "animate-turtle-bounce-gentle";
      case 3: return "animate-turtle-bounce-happy";
      case 4: return "animate-turtle-bounce-excited";
      default: return "";
    }
  };

  const getHeadAnimation = () => {
    if (isTouched) return "animate-turtle-head-react";
    switch (state) {
      case 0: return "animate-turtle-head-drowsy";
      case 1: return "animate-turtle-head-tilt";
      case 2: return "animate-turtle-head-nod";
      case 3: return "animate-turtle-head-happy";
      case 4: return "animate-turtle-head-excited";
      default: return "";
    }
  };

  const getTailAnimation = () => {
    if (isTouched) return "animate-turtle-tail-excited";
    if (state >= 3) return "animate-turtle-tail-wag";
    return "animate-turtle-tail-idle";
  };

  const eyeScaleY = getEyeScaleY();
  const showHappyEyes = state === 4 || isTouched;

  return (
    <svg 
      viewBox="0 0 200 200" 
      className={cn("w-full h-full cursor-pointer select-none", getBodyAnimation())}
      style={{ 
        overflow: 'visible',
        transform: `scale(${touchScale})`,
        transition: 'transform 0.15s ease-out'
      }}
    >
      <defs>
        {/* 그라디언트 정의 */}
        <radialGradient id="shellGradient" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A8E6A3" />
          <stop offset="70%" stopColor="#7BC96F" />
          <stop offset="100%" stopColor="#5FB854" />
        </radialGradient>
        
        <radialGradient id="bodyGradient" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#98E090" />
          <stop offset="100%" stopColor="#6BC95F" />
        </radialGradient>
        
        <radialGradient id="headGradient" cx="40%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#9FE897" />
          <stop offset="100%" stopColor="#6BC95F" />
        </radialGradient>
        
        <radialGradient id="cheekGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB5B5" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFB5B5" stopOpacity="0" />
        </radialGradient>
        
        <radialGradient id="shellPatternGradient" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#8FD687" />
          <stop offset="100%" stopColor="#6AAF5F" />
        </radialGradient>
        
        {/* 광택 효과 */}
        <linearGradient id="eyeShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="white" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* 반짝이 효과 (state 3, 4 또는 터치) */}
      {(state >= 3 || isTouched) && (
        <g className="animate-sparkle-float">
          <text x="170" y="40" fontSize="14" className="animate-sparkle" fill="#FFD700">✦</text>
          <text x="25" y="50" fontSize="10" className="animate-sparkle" style={{ animationDelay: '0.5s' }} fill="#FFD700">✦</text>
          {(state === 4 || isTouched) && (
            <text x="175" y="75" fontSize="8" className="animate-sparkle" style={{ animationDelay: '1s' }} fill="#FFD700">✦</text>
          )}
        </g>
      )}
      
      {/* 하트 효과 (state 4 또는 터치) */}
      {(state === 4 || isTouched) && (
        <g>
          <text x="175" y="60" fontSize="12" className="animate-heart-float" style={{ animationDelay: '0.3s' }} fill="#FF6B9D">♥</text>
          <text x="15" y="70" fontSize="9" className="animate-heart-float" style={{ animationDelay: '1s' }} fill="#FF6B9D">♥</text>
        </g>
      )}

      {/* 그림자 */}
      <ellipse 
        cx="100" 
        cy="185" 
        rx="50" 
        ry="10" 
        fill="rgba(0,0,0,0.08)"
        className={state >= 3 ? "animate-turtle-shadow" : ""}
      />
      
      {/* === 뒷다리 (뒤쪽에 위치) === */}
      <g id="backLegs">
        {/* 왼쪽 뒷다리 */}
        <ellipse 
          cx="55" 
          cy="155" 
          rx="16" 
          ry="20" 
          fill="url(#bodyGradient)"
          className={state >= 3 ? "animate-turtle-leg-back-left" : ""}
          style={{ transformOrigin: '55px 145px' }}
        />
        {/* 오른쪽 뒷다리 */}
        <ellipse 
          cx="145" 
          cy="155" 
          rx="16" 
          ry="20" 
          fill="url(#bodyGradient)"
          className={state >= 3 ? "animate-turtle-leg-back-right" : ""}
          style={{ transformOrigin: '145px 145px' }}
        />
      </g>

      {/* === 꼬리 === */}
      <g 
        id="tail" 
        className={getTailAnimation()} 
        style={{ transformOrigin: '100px 170px' }}
      >
        <ellipse cx="100" cy="175" rx="10" ry="7" fill="url(#bodyGradient)" />
        <circle cx="100" cy="180" r="4" fill="#6BC95F" />
      </g>

      {/* === 등껍질 (메인 바디) === */}
      <g id="shell">
        {/* 등껍질 외곽 - 볼륨감 있는 형태 */}
        <ellipse cx="100" cy="125" rx="58" ry="50" fill="url(#shellGradient)" />
        
        {/* 등껍질 테두리 하이라이트 */}
        <ellipse 
          cx="100" 
          cy="125" 
          rx="58" 
          ry="50" 
          fill="none" 
          stroke="#B8F0B0" 
          strokeWidth="2" 
          opacity="0.6" 
        />
        
        {/* 등껍질 패턴들 - 육각형 느낌 */}
        {/* 중앙 메인 */}
        <ellipse 
          cx="100" 
          cy="115" 
          rx="22" 
          ry="18" 
          fill="url(#shellPatternGradient)" 
          stroke="#5FA854" 
          strokeWidth="1.5" 
        />
        
        {/* 상단 좌우 */}
        <ellipse cx="70" cy="105" rx="14" ry="12" fill="url(#shellPatternGradient)" stroke="#5FA854" strokeWidth="1.2" />
        <ellipse cx="130" cy="105" rx="14" ry="12" fill="url(#shellPatternGradient)" stroke="#5FA854" strokeWidth="1.2" />
        
        {/* 하단 좌우 */}
        <ellipse cx="65" cy="135" rx="12" ry="10" fill="url(#shellPatternGradient)" stroke="#5FA854" strokeWidth="1.2" />
        <ellipse cx="135" cy="135" rx="12" ry="10" fill="url(#shellPatternGradient)" stroke="#5FA854" strokeWidth="1.2" />
        
        {/* 하단 중앙 */}
        <ellipse cx="100" cy="145" rx="15" ry="11" fill="url(#shellPatternGradient)" stroke="#5FA854" strokeWidth="1.2" />
        
        {/* 광택 하이라이트 */}
        <ellipse cx="85" cy="100" rx="12" ry="6" fill="white" opacity="0.25" />
      </g>

      {/* === 앞다리 (앞쪽에 위치) === */}
      <g id="frontLegs">
        {/* 왼쪽 앞다리 */}
        <ellipse 
          cx="45" 
          cy="130" 
          rx="18" 
          ry="22" 
          fill="url(#bodyGradient)"
          className={state >= 3 ? "animate-turtle-leg-front-left" : (state >= 1 ? "animate-turtle-leg-idle" : "")}
          style={{ transformOrigin: '55px 115px' }}
        />
        {/* 오른쪽 앞다리 */}
        <ellipse 
          cx="155" 
          cy="130" 
          rx="18" 
          ry="22" 
          fill="url(#bodyGradient)"
          className={state >= 3 ? "animate-turtle-leg-front-right" : (state >= 1 ? "animate-turtle-leg-idle-alt" : "")}
          style={{ transformOrigin: '145px 115px' }}
        />
      </g>

      {/* === 머리 === */}
      <g 
        id="head" 
        className={getHeadAnimation()} 
        style={{ transformOrigin: '100px 85px' }}
      >
        {/* 목 */}
        <ellipse cx="100" cy="85" rx="26" ry="18" fill="url(#headGradient)" />
        
        {/* 머리 본체 - 더 둥글고 큰 느낌 */}
        <ellipse cx="100" cy="65" rx="35" ry="32" fill="url(#headGradient)" />
        
        {/* 머리 광택 */}
        <ellipse cx="88" cy="50" rx="12" ry="8" fill="white" opacity="0.2" />
        
        {/* === 볼 블러시 === */}
        <ellipse cx="65" cy="75" rx="12" ry="8" fill="url(#cheekGradient)" />
        <ellipse cx="135" cy="75" rx="12" ry="8" fill="url(#cheekGradient)" />
        
        {/* === 눈 === */}
        <g id="eyes" style={{ transform: `scaleY(${eyeScaleY})`, transformOrigin: '100px 60px' }}>
          {/* 왼쪽 눈 */}
          <g>
            {/* 흰자 */}
            <ellipse cx="80" cy="60" rx="13" ry="15" fill="white" />
            {/* 눈동자 */}
            <ellipse cx="82" cy="62" rx="7" ry="9" fill="#2A2A2A" />
            {/* 하이라이트 (큰) */}
            <ellipse cx="84" cy="57" rx="3.5" ry="4" fill="white" />
            {/* 하이라이트 (작은) */}
            <circle cx="79" cy="65" r="1.5" fill="white" opacity="0.7" />
          </g>
          
          {/* 오른쪽 눈 */}
          <g>
            {/* 흰자 */}
            <ellipse cx="120" cy="60" rx="13" ry="15" fill="white" />
            {/* 눈동자 */}
            <ellipse cx="118" cy="62" rx="7" ry="9" fill="#2A2A2A" />
            {/* 하이라이트 (큰) */}
            <ellipse cx="120" cy="57" rx="3.5" ry="4" fill="white" />
            {/* 하이라이트 (작은) */}
            <circle cx="115" cy="65" r="1.5" fill="white" opacity="0.7" />
          </g>
        </g>
        
        {/* 행복한 눈 (state 4 또는 터치 시) */}
        {showHappyEyes && eyeScaleY < 0.8 && (
          <g id="happyEyes">
            <path d="M 67 58 Q 80 52 93 58" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 107 58 Q 120 52 133 58" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        )}

        {/* === 입 === */}
        <path 
          id="mouth" 
          d={getMouthPath()} 
          fill="none" 
          stroke="#4A8F3C" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        
        {/* 하품 효과 (state 0) */}
        {state === 0 && (
          <g className="animate-turtle-yawn" style={{ opacity: 0 }}>
            <ellipse cx="100" cy="108" rx="6" ry="8" fill="#FF9999" />
          </g>
        )}
      </g>

      {/* Zzz 효과 (state 0) */}
      {state === 0 && (
        <g className="animate-turtle-zzz">
          <text x="145" y="35" fontSize="14" fill="#9E9E9E" fontWeight="bold" fontFamily="sans-serif">z</text>
          <text x="158" y="25" fontSize="11" fill="#BDBDBD" fontWeight="bold" fontFamily="sans-serif">z</text>
          <text x="168" y="18" fontSize="8" fill="#D0D0D0" fontWeight="bold" fontFamily="sans-serif">z</text>
        </g>
      )}
    </svg>
  );
}

export function TurtleCharacter({ achievementCount }: TurtleCharacterProps) {
  const count = Math.min(4, Math.max(0, achievementCount)) as 0 | 1 | 2 | 3 | 4;
  const message = STATUS_MESSAGES[count];
  const [isTouched, setIsTouched] = useState(false);
  const [touchMessage, setTouchMessage] = useState<string | null>(null);

  const handleTouch = useCallback(() => {
    if (!isTouched) {
      setIsTouched(true);
      const randomMessage = TOUCH_MESSAGES[Math.floor(Math.random() * TOUCH_MESSAGES.length)];
      setTouchMessage(randomMessage);
    }
  }, [isTouched]);

  const handleTouchComplete = useCallback(() => {
    setIsTouched(false);
    setTimeout(() => setTouchMessage(null), 300);
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-border p-3 flex flex-col items-center w-full max-w-[280px]">
      {/* 거북이 캐릭터 - 터치 가능 영역 */}
      <div 
        className="relative w-36 h-36 flex items-center justify-center"
        onClick={handleTouch}
        onTouchStart={handleTouch}
      >
        <TurtleSVG 
          state={count} 
          isTouched={isTouched}
          onTouchComplete={handleTouchComplete}
        />
        
        {/* 터치 반응 말풍선 */}
        {touchMessage && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-turtle-speech-bubble">
            <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-border">
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {touchMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 상태 멘트 - 거북이 아래 */}
      <p className="text-sm text-muted-foreground font-medium text-center mt-2">
        {message}
      </p>
    </div>
  );
}
