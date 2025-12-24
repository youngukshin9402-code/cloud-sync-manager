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
    <div className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
      {/* 거북이 SVG - 서있는 포즈 */}
      <div className="relative w-20 h-20 shrink-0">
        {/* 반짝이/하트 이펙트 */}
        {count >= 3 && (
          <>
            <div 
              className="absolute top-0 right-2 w-2 h-2 text-yellow-400 animate-sparkle text-xs"
              style={{ animationDelay: "0s" }}
            >
              ✦
            </div>
            <div 
              className="absolute top-2 left-1 w-2 h-2 text-yellow-400 animate-sparkle text-xs"
              style={{ animationDelay: "0.5s" }}
            >
              ✦
            </div>
          </>
        )}
        {count === 4 && (
          <>
            <div 
              className="absolute -top-1 right-4 text-pink-400 text-xs animate-heart-float"
              style={{ animationDelay: "0.3s" }}
            >
              ♥
            </div>
            <div 
              className="absolute top-1 left-3 text-pink-300 text-[10px] animate-heart-float"
              style={{ animationDelay: "1s" }}
            >
              ♥
            </div>
          </>
        )}

        {/* 거북이 본체 - 서있는 포즈 */}
        <svg
          viewBox="0 0 100 100"
          className={cn("w-full h-full", bodyAnimation)}
        >
          {/* 다리 (뒤쪽) */}
          <ellipse cx="30" cy="78" rx="10" ry="8" fill="hsl(95, 45%, 65%)" />
          <ellipse cx="70" cy="78" rx="10" ry="8" fill="hsl(95, 45%, 65%)" />
          
          {/* 꼬리 */}
          <ellipse
            cx="85"
            cy="60"
            rx="6"
            ry="4"
            fill="hsl(95, 45%, 65%)"
            className={count === 3 ? "animate-turtle-tail-wag origin-center" : ""}
          />

          {/* 등딱지 (메인) - 옆모습 */}
          <ellipse
            cx="50"
            cy="50"
            rx="35"
            ry="28"
            fill="hsl(145, 50%, 55%)"
            stroke="hsl(145, 45%, 40%)"
            strokeWidth="2"
          />
          
          {/* 등딱지 무늬 */}
          <ellipse cx="50" cy="45" rx="20" ry="15" fill="hsl(145, 55%, 65%)" />
          <ellipse cx="35" cy="55" rx="10" ry="8" fill="hsl(145, 55%, 65%)" />
          <ellipse cx="65" cy="55" rx="10" ry="8" fill="hsl(145, 55%, 65%)" />
          <ellipse cx="50" cy="62" rx="12" ry="7" fill="hsl(145, 55%, 65%)" />

          {/* 다리 (앞쪽) */}
          <ellipse cx="25" cy="70" rx="9" ry="7" fill="hsl(95, 45%, 65%)" stroke="hsl(95, 40%, 50%)" strokeWidth="1" />
          <ellipse cx="75" cy="70" rx="9" ry="7" fill="hsl(95, 45%, 65%)" stroke="hsl(95, 40%, 50%)" strokeWidth="1" />

          {/* 머리 */}
          <ellipse
            cx="15"
            cy="45"
            rx="14"
            ry="13"
            fill="hsl(95, 45%, 68%)"
            stroke="hsl(95, 40%, 52%)"
            strokeWidth="1.5"
          />

          {/* 볼터치 */}
          <ellipse cx="10" cy="50" rx="4" ry="2.5" fill="hsl(350, 80%, 85%)" opacity="0.7" />

          {/* 눈 */}
          <g className={eyeAnimation}>
            {isHeartEyes ? (
              <>
                {/* 하트 눈 */}
                <text x="9" y="45" fontSize="10" fill="hsl(350, 80%, 60%)">♥</text>
              </>
            ) : (
              <>
                {/* 큰 귀여운 눈 */}
                <ellipse
                  cx="12"
                  cy="42"
                  rx="5"
                  ry={isHalfClosed ? 2 : 5}
                  fill="hsl(0, 0%, 10%)"
                />
                {/* 눈 반짝임 */}
                {!isHalfClosed && (
                  <>
                    <circle cx="14" cy="40" r="1.5" fill="white" />
                    <circle cx="10" cy="43" r="0.8" fill="white" opacity="0.6" />
                  </>
                )}
              </>
            )}
          </g>

          {/* 입 - 상태에 따라 변화 */}
          {count === 0 && (
            // 졸린 입 (하품 느낌)
            <ellipse cx="8" cy="52" rx="2.5" ry="2" fill="hsl(350, 50%, 55%)" />
          )}
          {count === 1 && (
            // 무표정 입
            <line x1="5" y1="52" x2="11" y2="52" stroke="hsl(0, 0%, 30%)" strokeWidth="1.5" strokeLinecap="round" />
          )}
          {count === 2 && (
            // 살짝 미소
            <path d="M5 51 Q8 54, 11 51" stroke="hsl(0, 0%, 30%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}
          {count >= 3 && (
            // 활짝 웃음
            <path d="M4 50 Q8 56, 12 50" stroke="hsl(0, 0%, 30%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}
        </svg>
      </div>

      {/* 상태 멘트 */}
      <p className="text-sm text-muted-foreground font-medium flex-1">
        {message}
      </p>
    </div>
  );
}
