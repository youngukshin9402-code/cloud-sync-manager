import React, { useEffect, useState } from "react";
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

// 귀여운 거북이 SVG 컴포넌트 - 부위별 분리 애니메이션
function TurtleSVG({ state }: { state: 0 | 1 | 2 | 3 | 4 }) {
  const [blinkPhase, setBlinkPhase] = useState(0);
  
  // 눈 깜빡임 효과
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkPhase(1);
      setTimeout(() => setBlinkPhase(0), 150);
    }, state === 0 ? 4000 : state === 4 ? 2000 : 3000);
    
    return () => clearInterval(blinkInterval);
  }, [state]);

  // 상태별 눈 모양
  const getEyeStyle = () => {
    if (blinkPhase === 1) return { scaleY: 0.1 };
    if (state === 0) return { scaleY: 0.5 }; // 졸린 눈
    if (state === 4) return { scaleY: 0.6 }; // 반달눈 웃음
    return { scaleY: 1 };
  };

  // 상태별 입 모양
  const getMouthPath = () => {
    if (state === 0) return "M 42 58 Q 50 56 58 58"; // 졸린 입
    if (state === 4) return "M 40 55 Q 50 65 60 55"; // 활짝 웃음
    if (state === 3) return "M 42 55 Q 50 62 58 55"; // 미소
    return "M 44 56 Q 50 58 56 56"; // 기본
  };

  // 상태별 애니메이션 클래스
  const getBodyAnimation = () => {
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
    switch (state) {
      case 0: return "animate-turtle-head-drowsy";
      case 1: return "animate-turtle-head-tilt";
      case 2: return "animate-turtle-head-nod";
      case 3: return "animate-turtle-head-happy";
      case 4: return "animate-turtle-head-excited";
      default: return "";
    }
  };

  const getLegAnimation = () => {
    switch (state) {
      case 3: return "animate-turtle-legs-step";
      case 4: return "animate-turtle-legs-walk";
      default: return "";
    }
  };

  const getTailAnimation = () => {
    if (state >= 3) return "animate-turtle-tail-wag";
    return "animate-turtle-tail-idle";
  };

  const eyeStyle = getEyeStyle();

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={cn("w-full h-full", getBodyAnimation())}
      style={{ overflow: 'visible' }}
    >
      {/* 반짝이 효과 (state 3, 4) */}
      {state >= 3 && (
        <g className="animate-sparkle-float">
          <text x="85" y="20" fontSize="8" className="animate-sparkle">✦</text>
          <text x="10" y="25" fontSize="6" className="animate-sparkle" style={{ animationDelay: '0.5s' }}>✦</text>
        </g>
      )}
      
      {/* 하트 효과 (state 4) */}
      {state === 4 && (
        <g>
          <text x="88" y="35" fontSize="7" className="animate-heart-float" style={{ animationDelay: '0.3s' }}>♥</text>
          <text x="5" y="40" fontSize="5" className="animate-heart-float" style={{ animationDelay: '1s' }}>♥</text>
        </g>
      )}

      {/* 그림자 */}
      <ellipse cx="50" cy="92" rx="28" ry="6" fill="rgba(0,0,0,0.1)" />
      
      {/* 뒷다리 */}
      <g id="backLegs" className={getLegAnimation()}>
        {/* 왼쪽 뒷다리 */}
        <ellipse cx="28" cy="75" rx="8" ry="10" fill="#8FBC8F" 
          className={state >= 3 ? "animate-turtle-leg-back-left" : ""} />
        {/* 오른쪽 뒷다리 */}
        <ellipse cx="72" cy="75" rx="8" ry="10" fill="#8FBC8F"
          className={state >= 3 ? "animate-turtle-leg-back-right" : ""} />
      </g>

      {/* 꼬리 */}
      <g id="tail" className={getTailAnimation()} style={{ transformOrigin: '50px 85px' }}>
        <ellipse cx="50" cy="88" rx="5" ry="4" fill="#8FBC8F" />
        <circle cx="50" cy="91" r="2" fill="#7CAF7C" />
      </g>

      {/* 등껍질 (메인 바디) */}
      <g id="shell">
        {/* 등껍질 외곽 */}
        <ellipse cx="50" cy="58" rx="32" ry="28" fill="#90C67C" />
        {/* 등껍질 패턴 - 중앙 */}
        <ellipse cx="50" cy="52" rx="12" ry="10" fill="#7CB668" stroke="#6AA358" strokeWidth="1" />
        {/* 등껍질 패턴 - 좌상 */}
        <ellipse cx="35" cy="48" rx="8" ry="7" fill="#7CB668" stroke="#6AA358" strokeWidth="0.8" />
        {/* 등껍질 패턴 - 우상 */}
        <ellipse cx="65" cy="48" rx="8" ry="7" fill="#7CB668" stroke="#6AA358" strokeWidth="0.8" />
        {/* 등껍질 패턴 - 좌하 */}
        <ellipse cx="32" cy="65" rx="7" ry="6" fill="#7CB668" stroke="#6AA358" strokeWidth="0.8" />
        {/* 등껍질 패턴 - 우하 */}
        <ellipse cx="68" cy="65" rx="7" ry="6" fill="#7CB668" stroke="#6AA358" strokeWidth="0.8" />
        {/* 등껍질 테두리 하이라이트 */}
        <ellipse cx="50" cy="58" rx="32" ry="28" fill="none" stroke="#A8D99A" strokeWidth="2" opacity="0.5" />
      </g>

      {/* 앞다리 */}
      <g id="frontLegs" className={getLegAnimation()}>
        {/* 왼쪽 앞다리 */}
        <ellipse cx="22" cy="60" rx="9" ry="11" fill="#8FBC8F"
          className={state >= 3 ? "animate-turtle-leg-front-left" : ""} />
        {/* 오른쪽 앞다리 */}
        <ellipse cx="78" cy="60" rx="9" ry="11" fill="#8FBC8F"
          className={state >= 3 ? "animate-turtle-leg-front-right" : ""} />
      </g>

      {/* 머리 */}
      <g id="head" className={getHeadAnimation()} style={{ transformOrigin: '50px 35px' }}>
        {/* 목 */}
        <ellipse cx="50" cy="38" rx="14" ry="10" fill="#8FBC8F" />
        
        {/* 머리 본체 */}
        <ellipse cx="50" cy="28" rx="18" ry="16" fill="#8FBC8F" />
        
        {/* 볼 터치 (블러시) */}
        <ellipse cx="36" cy="32" rx="5" ry="3" fill="#FFB6C1" opacity="0.5" />
        <ellipse cx="64" cy="32" rx="5" ry="3" fill="#FFB6C1" opacity="0.5" />
        
        {/* 눈 */}
        <g id="eyes" style={{ transform: `scaleY(${eyeStyle.scaleY})`, transformOrigin: '50px 26px' }}>
          {/* 왼쪽 눈 흰자 */}
          <ellipse cx="42" cy="26" rx="6" ry="7" fill="white" />
          {/* 왼쪽 눈동자 */}
          <ellipse cx="43" cy="27" rx="3.5" ry="4" fill="#2D2D2D" />
          {/* 왼쪽 눈 하이라이트 */}
          <circle cx="44" cy="25" r="1.5" fill="white" />
          
          {/* 오른쪽 눈 흰자 */}
          <ellipse cx="58" cy="26" rx="6" ry="7" fill="white" />
          {/* 오른쪽 눈동자 */}
          <ellipse cx="57" cy="27" rx="3.5" ry="4" fill="#2D2D2D" />
          {/* 오른쪽 눈 하이라이트 */}
          <circle cx="58" cy="25" r="1.5" fill="white" />
        </g>

        {/* 입 */}
        <path 
          id="mouth" 
          d={getMouthPath()} 
          fill="none" 
          stroke="#5D8A4E" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        
        {/* 하품 효과 (state 0) */}
        {state === 0 && (
          <g className="animate-turtle-yawn" style={{ opacity: 0 }}>
            <ellipse cx="50" cy="58" rx="4" ry="5" fill="#FF9999" />
          </g>
        )}
      </g>

      {/* Zzz 효과 (state 0) */}
      {state === 0 && (
        <g className="animate-turtle-zzz">
          <text x="70" y="15" fontSize="8" fill="#9E9E9E" fontWeight="bold">z</text>
          <text x="78" y="10" fontSize="6" fill="#BDBDBD" fontWeight="bold">z</text>
          <text x="84" y="6" fontSize="4" fill="#E0E0E0" fontWeight="bold">z</text>
        </g>
      )}
    </svg>
  );
}

export function TurtleCharacter({ achievementCount }: TurtleCharacterProps) {
  const count = Math.min(4, Math.max(0, achievementCount)) as 0 | 1 | 2 | 3 | 4;
  const message = STATUS_MESSAGES[count];

  return (
    <div className="bg-card rounded-2xl border border-border p-3 flex flex-col items-center w-full max-w-[280px]">
      {/* 거북이 캐릭터 - 중앙, 더 크게 */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        <TurtleSVG state={count} />
      </div>

      {/* 상태 멘트 - 거북이 아래 */}
      <p className="text-sm text-muted-foreground font-medium text-center mt-2">
        {message}
      </p>
    </div>
  );
}
