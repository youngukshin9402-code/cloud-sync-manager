import React from "react";
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

export function TurtleCharacter({ achievementCount }: TurtleCharacterProps) {
  const count = Math.min(4, Math.max(0, achievementCount)) as 0 | 1 | 2 | 3 | 4;
  const message = STATUS_MESSAGES[count];

  // 상태별 애니메이션 클래스
  const bodyAnimation = {
    0: "animate-turtle-nod-slow",
    1: "animate-turtle-sway",
    2: "animate-turtle-bounce-soft",
    3: "animate-turtle-bounce-big",
    4: "animate-turtle-walk",
  }[count];

  const eyeAnimation = {
    0: "animate-turtle-blink-slow",
    1: "",
    2: "animate-turtle-blink",
    3: "animate-turtle-blink",
    4: "",
  }[count];

  // 눈 상태 (0: 반쯤 감김, 4: 하트 눈)
  const isHalfClosed = count === 0;
  const isHeartEyes = count === 4;

  return (
    <div className="bg-card rounded-3xl border border-border p-4 flex flex-col items-center gap-3">
      {/* 거북이 SVG */}
      <div className="relative w-28 h-28">
        {/* 반짝이/하트 이펙트 */}
        {count >= 3 && (
          <>
            <div 
              className="absolute top-1 right-4 w-3 h-3 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "0s" }}
            >
              ✦
            </div>
            <div 
              className="absolute top-4 left-3 w-2 h-2 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "0.5s" }}
            >
              ✦
            </div>
          </>
        )}
        {count === 4 && (
          <>
            <div 
              className="absolute top-0 right-8 text-pink-400 text-sm animate-heart-float"
              style={{ animationDelay: "0.3s" }}
            >
              ♥
            </div>
            <div 
              className="absolute top-2 left-6 text-pink-300 text-xs animate-heart-float"
              style={{ animationDelay: "1s" }}
            >
              ♥
            </div>
          </>
        )}

        {/* 거북이 본체 */}
        <svg
          viewBox="0 0 100 100"
          className={cn("w-full h-full", bodyAnimation)}
        >
          {/* 등딱지 */}
          <ellipse
            cx="50"
            cy="55"
            rx="32"
            ry="28"
            fill="hsl(145, 45%, 55%)"
            stroke="hsl(145, 40%, 40%)"
            strokeWidth="2"
          />
          {/* 등딱지 무늬 */}
          <ellipse cx="50" cy="50" rx="18" ry="14" fill="hsl(145, 50%, 65%)" />
          <ellipse cx="40" cy="62" rx="8" ry="6" fill="hsl(145, 50%, 65%)" />
          <ellipse cx="60" cy="62" rx="8" ry="6" fill="hsl(145, 50%, 65%)" />
          <ellipse cx="50" cy="70" rx="10" ry="6" fill="hsl(145, 50%, 65%)" />

          {/* 머리 */}
          <ellipse
            cx="50"
            cy="24"
            rx="14"
            ry="12"
            fill="hsl(85, 40%, 70%)"
            stroke="hsl(85, 35%, 55%)"
            strokeWidth="1.5"
          />

          {/* 볼터치 */}
          <ellipse cx="40" cy="26" rx="4" ry="2.5" fill="hsl(350, 80%, 85%)" opacity="0.6" />
          <ellipse cx="60" cy="26" rx="4" ry="2.5" fill="hsl(350, 80%, 85%)" opacity="0.6" />

          {/* 눈 */}
          <g className={eyeAnimation}>
            {isHeartEyes ? (
              <>
                {/* 하트 눈 */}
                <text x="43" y="24" fontSize="8" fill="hsl(350, 80%, 60%)">♥</text>
                <text x="53" y="24" fontSize="8" fill="hsl(350, 80%, 60%)">♥</text>
              </>
            ) : (
              <>
                {/* 일반 눈 */}
                <ellipse
                  cx="44"
                  cy="22"
                  rx="3"
                  ry={isHalfClosed ? 1.5 : 3}
                  fill="hsl(0, 0%, 15%)"
                />
                <ellipse
                  cx="56"
                  cy="22"
                  rx="3"
                  ry={isHalfClosed ? 1.5 : 3}
                  fill="hsl(0, 0%, 15%)"
                />
                {/* 눈 반짝임 (졸린 상태 제외) */}
                {!isHalfClosed && (
                  <>
                    <circle cx="45" cy="21" r="1" fill="white" />
                    <circle cx="57" cy="21" r="1" fill="white" />
                  </>
                )}
              </>
            )}
          </g>

          {/* 입 - 상태에 따라 변화 */}
          {count === 0 && (
            // 졸린 입 (하품 느낌)
            <ellipse cx="50" cy="30" rx="3" ry="2" fill="hsl(350, 50%, 60%)" />
          )}
          {count === 1 && (
            // 무표정 입
            <line x1="47" y1="30" x2="53" y2="30" stroke="hsl(0, 0%, 30%)" strokeWidth="1.5" strokeLinecap="round" />
          )}
          {count === 2 && (
            // 살짝 미소
            <path d="M46 29 Q50 32, 54 29" stroke="hsl(0, 0%, 30%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}
          {count >= 3 && (
            // 활짝 웃음
            <path d="M44 28 Q50 34, 56 28" stroke="hsl(0, 0%, 30%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}

          {/* 앞다리 */}
          <ellipse cx="28" cy="50" rx="8" ry="5" fill="hsl(85, 40%, 70%)" stroke="hsl(85, 35%, 55%)" strokeWidth="1" />
          <ellipse cx="72" cy="50" rx="8" ry="5" fill="hsl(85, 40%, 70%)" stroke="hsl(85, 35%, 55%)" strokeWidth="1" />

          {/* 뒷다리 */}
          <ellipse cx="30" cy="72" rx="7" ry="5" fill="hsl(85, 40%, 70%)" stroke="hsl(85, 35%, 55%)" strokeWidth="1" />
          <ellipse cx="70" cy="72" rx="7" ry="5" fill="hsl(85, 40%, 70%)" stroke="hsl(85, 35%, 55%)" strokeWidth="1" />

          {/* 꼬리 */}
          <ellipse
            cx="50"
            cy="86"
            rx="5"
            ry="4"
            fill="hsl(85, 40%, 70%)"
            stroke="hsl(85, 35%, 55%)"
            strokeWidth="1"
            className={count === 3 ? "animate-turtle-tail-wag origin-center" : ""}
          />
        </svg>
      </div>

      {/* 상태 멘트 */}
      <p className="text-sm text-muted-foreground text-center font-medium">
        {message}
      </p>
    </div>
  );
}
