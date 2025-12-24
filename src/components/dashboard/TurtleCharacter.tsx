import React from "react";
import { cn } from "@/lib/utils";

// Import turtle images
import turtle0 from "@/assets/turtle_0_sleepy.png";
import turtle1 from "@/assets/turtle_1_low.png";
import turtle2 from "@/assets/turtle_2_normal.png";
import turtle3 from "@/assets/turtle_3_good.png";
import turtle4 from "@/assets/turtle_4_great.png";

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

const TURTLE_ASSETS: Record<number, string> = {
  0: turtle0,
  1: turtle1,
  2: turtle2,
  3: turtle3,
  4: turtle4,
};

export function TurtleCharacter({ achievementCount }: TurtleCharacterProps) {
  const count = Math.min(4, Math.max(0, achievementCount)) as 0 | 1 | 2 | 3 | 4;
  const message = STATUS_MESSAGES[count];
  const turtleImage = TURTLE_ASSETS[count];

  // 상태별 애니메이션 클래스
  const imageAnimation = {
    0: "animate-turtle-nod-slow",
    1: "animate-turtle-sway",
    2: "animate-turtle-bounce-soft",
    3: "animate-turtle-bounce-big",
    4: "animate-turtle-walk",
  }[count];

  return (
    <div className="bg-card rounded-2xl border border-border p-2 flex flex-col items-center">
      {/* 거북이 이미지 - 중앙 */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* 반짝이/하트 이펙트 */}
        {count >= 3 && (
          <>
            <div 
              className="absolute top-1 right-3 text-yellow-400 animate-sparkle text-sm"
              style={{ animationDelay: "0s" }}
            >
              ✦
            </div>
            <div 
              className="absolute top-3 left-2 text-yellow-400 animate-sparkle text-xs"
              style={{ animationDelay: "0.5s" }}
            >
              ✦
            </div>
          </>
        )}
        {count === 4 && (
          <>
            <div 
              className="absolute -top-1 right-6 text-pink-400 text-sm animate-heart-float"
              style={{ animationDelay: "0.3s" }}
            >
              ♥
            </div>
            <div 
              className="absolute top-2 left-4 text-pink-300 text-xs animate-heart-float"
              style={{ animationDelay: "1s" }}
            >
              ♥
            </div>
          </>
        )}

        {/* 거북이 에셋 이미지 */}
        <img
          src={turtleImage}
          alt={`거북이 상태 ${count}/4`}
          className={cn("w-20 h-20 object-contain", imageAnimation)}
        />
      </div>

      {/* 상태 멘트 - 거북이 아래 */}
      <p className="text-sm text-muted-foreground font-medium text-center mt-1">
        {message}
      </p>
    </div>
  );
}
