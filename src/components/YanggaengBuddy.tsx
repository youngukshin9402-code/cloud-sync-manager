import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface YanggaengBuddyProps {
  completedCount: number; // 0~4
  className?: string;
}

// 상태별 설정
const stateConfigs = {
  1: {
    message: "오늘은… 쉬엄쉬엄 🫠",
    tapReaction: "삐짐…",
    bodyGradientStart: "#c9a06a",
    bodyGradientEnd: "#a8855a",
    highlightOpacity: 0.15,
    glowOpacity: 0,
    cheekOpacity: 0.05,
    bounceY: [-2, 0, -2],
    bounceDuration: 4.6,
    scaleX: [1, 1.01, 1],
    scaleY: [1, 0.99, 1],
  },
  2: {
    message: "조금만 더 해볼까? 🥺",
    tapReaction: "으음…",
    bodyGradientStart: "#d4a86d",
    bodyGradientEnd: "#b89058",
    highlightOpacity: 0.18,
    glowOpacity: 0,
    cheekOpacity: 0.12,
    bounceY: [-3, 0, -3],
    bounceDuration: 3.8,
    scaleX: [1, 1.02, 1],
    scaleY: [1, 0.98, 1],
  },
  3: {
    message: "좋아, 반은 했어 🙂",
    tapReaction: "좋아~",
    bodyGradientStart: "#e8a854",
    bodyGradientEnd: "#d49545",
    highlightOpacity: 0.22,
    glowOpacity: 0.05,
    cheekOpacity: 0.18,
    bounceY: [-6, 0, -6],
    bounceDuration: 2.8,
    scaleX: [1, 1.05, 1],
    scaleY: [1, 0.95, 1],
  },
  4: {
    message: "거의 다 왔다! ✨",
    tapReaction: "파이팅!",
    bodyGradientStart: "#f0a830",
    bodyGradientEnd: "#e09520",
    highlightOpacity: 0.25,
    glowOpacity: 0.08,
    cheekOpacity: 0.26,
    bounceY: [-8, 0, -8],
    bounceDuration: 2.4,
    scaleX: [1, 1.06, 1],
    scaleY: [1, 0.94, 1],
  },
  5: {
    message: "완벽해! 최고야!! 💛",
    tapReaction: "최고!!",
    bodyGradientStart: "#ffb020",
    bodyGradientEnd: "#f5a010",
    highlightOpacity: 0.28,
    glowOpacity: 0.12,
    cheekOpacity: 0.32,
    bounceY: [-11, 0, -11],
    bounceDuration: 2.0,
    scaleX: [1, 1.07, 1],
    scaleY: [1, 0.93, 1],
  },
} as const;

// 눈 모양 - state별 차이 확실하게
const getEyeProps = (state: 1 | 2 | 3 | 4 | 5, isBlinking: boolean) => {
  if (isBlinking) {
    return { type: "blink", scaleY: 0.1 };
  }
  switch (state) {
    case 1: return { type: "sleepy", scaleY: 0.4 }; // 반쯤 감은 눈
    case 2: return { type: "small", scaleY: 0.7 }; // 작은 눈
    case 3: return { type: "normal", scaleY: 1 };
    case 4: return { type: "bright", scaleY: 1.05 }; // 초롱
    case 5: return { type: "happy", scaleY: 0.6 }; // 반달눈
  }
};

// 입 모양 path
const getMouthPath = (state: 1 | 2 | 3 | 4 | 5) => {
  switch (state) {
    case 1: return "M 95 82 L 115 80 L 135 82"; // 삐죽/일자
    case 2: return "M 98 80 Q 115 84 132 80"; // 작은 곡선
    case 3: return "M 95 78 Q 115 88 135 78"; // 기본 미소
    case 4: return "M 92 76 Q 115 92 138 76"; // 더 큰 미소
    case 5: return "M 88 74 Q 115 98 142 74"; // 활짝 웃음
  }
};

// 눈썹 각도
const getEyebrowAngle = (state: 1 | 2 | 3 | 4 | 5) => {
  switch (state) {
    case 1: return -15; // 찡그림
    case 2: return -8;
    default: return 0;
  }
};

export function YanggaengBuddy({ completedCount, className }: YanggaengBuddyProps) {
  const reducedMotion = useReducedMotion();
  const state = Math.max(1, Math.min(5, completedCount + 1)) as 1 | 2 | 3 | 4 | 5;
  const config = stateConfigs[state];
  
  // Blink 랜덤 간격
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);
  
  const scheduleBlink = useCallback(() => {
    const delay = 2500 + Math.random() * 3000;
    blinkTimeoutRef.current = window.setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        scheduleBlink();
      }, 120);
    }, delay);
  }, []);
  
  useEffect(() => {
    if (!reducedMotion) {
      scheduleBlink();
    }
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [scheduleBlink, reducedMotion]);
  
  // Tap reaction
  const [isTapped, setIsTapped] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [tapHeart, setTapHeart] = useState(false);
  
  const handleTap = () => {
    setIsTapped(true);
    setShowBubble(true);
    if (state === 5) setTapHeart(true);
    
    setTimeout(() => setIsTapped(false), 220);
    setTimeout(() => setShowBubble(false), 1200);
    setTimeout(() => setTapHeart(false), 1100);
  };
  
  // Effects (sparkle/heart) for state 4-5
  const [effects, setEffects] = useState<{ id: number; type: "sparkle" | "heart"; x: number; y: number }[]>([]);
  const effectIdRef = useRef(0);
  
  useEffect(() => {
    if (state < 4 || reducedMotion) return;
    
    const spawnEffect = () => {
      const count = state === 5 && Math.random() > 0.6 ? 2 : 1;
      const newEffects: typeof effects = [];
      for (let i = 0; i < count; i++) {
        newEffects.push({
          id: effectIdRef.current++,
          type: state === 5 && Math.random() > 0.4 ? "heart" : "sparkle",
          x: 70 + Math.random() * 80,
          y: 15 + Math.random() * 25,
        });
      }
      setEffects(prev => [...prev.slice(-1), ...newEffects]);
      
      setTimeout(() => {
        setEffects(prev => prev.filter(e => !newEffects.some(n => n.id === e.id)));
      }, state === 5 ? 1100 : 900);
    };
    
    const interval = state === 5 ? (5000 + Math.random() * 3000) : (7000 + Math.random() * 3000);
    const timer = setInterval(spawnEffect, interval);
    return () => clearInterval(timer);
  }, [state, reducedMotion]);

  const springConfig = { stiffness: 300, damping: 20, mass: 0.8 };
  
  const eyeProps = getEyeProps(state, isBlinking);

  const bounceAnimation = useMemo(() => reducedMotion ? {} : {
    y: [...config.bounceY],
    scaleX: [...config.scaleX],
    scaleY: [...config.scaleY],
    transition: {
      y: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
      scaleX: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
      scaleY: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
    },
  }, [config, reducedMotion]);

  const shadowAnimation = useMemo(() => reducedMotion ? {} : {
    scaleX: [1, 0.90, 1],
    transition: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
  }, [config.bounceDuration, reducedMotion]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.svg
        viewBox="0 0 230 130"
        className="w-[200px] h-[120px] sm:w-[220px] sm:h-[130px] cursor-pointer select-none"
        onClick={handleTap}
        animate={{ scale: isTapped ? 1.06 : 1 }}
        transition={{ type: "spring", ...springConfig, duration: 0.22 }}
      >
        <defs>
          <linearGradient id="jellyBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <motion.stop
              offset="0%"
              animate={{ stopColor: config.bodyGradientStart }}
              transition={{ type: "spring", ...springConfig }}
            />
            <motion.stop
              offset="100%"
              animate={{ stopColor: config.bodyGradientEnd }}
              transition={{ type: "spring", ...springConfig }}
            />
          </linearGradient>
          <radialGradient id="jellyHighlight" cx="25%" cy="18%" r="45%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="jellyGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shadow */}
        <motion.ellipse
          cx="115"
          cy="118"
          rx="50"
          ry="9"
          fill="rgba(0,0,0,0.12)"
          animate={shadowAnimation}
        />

        {/* Body Group with bounce */}
        <motion.g
          animate={bounceAnimation}
          style={{ transformOrigin: "115px 65px" }}
        >
          {/* Glow (state 3+) */}
          {state >= 3 && (
            <motion.rect
              x="55"
              y="18"
              width="120"
              height="85"
              rx="26"
              ry="26"
              fill={config.bodyGradientStart}
              animate={{ opacity: config.glowOpacity }}
              transition={{ type: "spring", ...springConfig }}
              filter="url(#jellyGlow)"
            />
          )}

          {/* Jelly Body - Rounded Rectangle */}
          <motion.rect
            x="55"
            y="18"
            width="120"
            height="85"
            rx="26"
            ry="26"
            fill="url(#jellyBodyGradient)"
          />

          {/* Main Highlight */}
          <motion.ellipse
            cx="85"
            cy="38"
            rx="28"
            ry="16"
            fill="url(#jellyHighlight)"
            animate={{ opacity: config.highlightOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Small Gloss Dot */}
          <circle cx="72" cy="32" r="5" fill="white" opacity="0.35" />

          {/* Eyebrows (state 1-2 only) */}
          {state <= 2 && (
            <>
              <motion.line
                x1="82"
                y1="42"
                x2="98"
                y2="44"
                stroke="#5d4037"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{ rotate: getEyebrowAngle(state) }}
                style={{ transformOrigin: "90px 43px" }}
                transition={{ type: "spring", ...springConfig }}
              />
              <motion.line
                x1="132"
                y1="44"
                x2="148"
                y2="42"
                stroke="#5d4037"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{ rotate: -getEyebrowAngle(state) }}
                style={{ transformOrigin: "140px 43px" }}
                transition={{ type: "spring", ...springConfig }}
              />
            </>
          )}

          {/* Left Eye */}
          {state === 5 && !isBlinking ? (
            // 반달눈 (웃는 눈)
            <path
              d="M 82 56 Q 90 50 98 56"
              fill="none"
              stroke="#3d2914"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          ) : state === 1 && !isBlinking ? (
            // 반쯤 감은 눈 (arc)
            <path
              d="M 82 55 Q 90 52 98 55"
              fill="none"
              stroke="#3d2914"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <motion.ellipse
              cx="90"
              cy="54"
              rx="9"
              ry="11"
              fill="#3d2914"
              animate={{ scaleY: eyeProps.scaleY }}
              transition={{ duration: isBlinking ? 0.06 : 0.15 }}
              style={{ transformOrigin: "90px 54px" }}
            />
          )}

          {/* Right Eye */}
          {state === 5 && !isBlinking ? (
            <path
              d="M 132 56 Q 140 50 148 56"
              fill="none"
              stroke="#3d2914"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          ) : state === 1 && !isBlinking ? (
            <path
              d="M 132 55 Q 140 52 148 55"
              fill="none"
              stroke="#3d2914"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <motion.ellipse
              cx="140"
              cy="54"
              rx="9"
              ry="11"
              fill="#3d2914"
              animate={{ scaleY: eyeProps.scaleY }}
              transition={{ duration: isBlinking ? 0.06 : 0.15 }}
              style={{ transformOrigin: "140px 54px" }}
            />
          )}

          {/* Eye Highlights (state 4-5) */}
          {state >= 4 && !isBlinking && state !== 5 && (
            <>
              <circle cx="93" cy="50" r="3" fill="white" opacity="0.95" />
              <circle cx="143" cy="50" r="3" fill="white" opacity="0.95" />
            </>
          )}
          {state === 5 && !isBlinking && (
            <>
              {/* 반달눈 위의 반짝임 */}
              <circle cx="90" cy="48" r="2.5" fill="white" opacity="0.9" />
              <circle cx="140" cy="48" r="2.5" fill="white" opacity="0.9" />
            </>
          )}

          {/* Cheeks */}
          <motion.ellipse
            cx="68"
            cy="68"
            rx="14"
            ry="9"
            fill="#ff9090"
            animate={{ opacity: config.cheekOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />
          <motion.ellipse
            cx="162"
            cy="68"
            rx="14"
            ry="9"
            fill="#ff9090"
            animate={{ opacity: config.cheekOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Mouth */}
          <motion.path
            d={getMouthPath(state)}
            fill="none"
            stroke="#5d4037"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={false}
            animate={{ d: getMouthPath(state) }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Sparkle/Heart effects (state 4-5) */}
          <AnimatePresence>
            {effects.map(effect => (
              <motion.g key={effect.id}>
                {effect.type === "sparkle" ? (
                  <motion.path
                    d="M0,-7 L2,0 L0,7 L-2,0 Z M-7,0 L0,2 L7,0 L0,-2 Z"
                    fill="#ffd700"
                    initial={{ x: effect.x, y: effect.y, scale: 0.5, opacity: 0 }}
                    animate={{ 
                      y: effect.y - 18,
                      scale: [0.5, 1.2, 0.9],
                      opacity: [0, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: state === 5 ? 1.1 : 0.9, ease: "easeOut" }}
                  />
                ) : (
                  <motion.path
                    d="M0,4 C0,0 -4,-4 -6,-4 C-9,-4 -9,1 -9,1 C-9,6 0,11 0,11 C0,11 9,6 9,1 C9,1 9,-4 6,-4 C4,-4 0,0 0,4 Z"
                    fill="#ff6b9d"
                    initial={{ x: effect.x, y: effect.y, scale: 0.4, opacity: 0 }}
                    animate={{ 
                      y: effect.y - 18,
                      scale: [0.4, 1.1, 0.85],
                      opacity: [0, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                )}
              </motion.g>
            ))}
          </AnimatePresence>

          {/* Tap Heart (state 5 only) */}
          <AnimatePresence>
            {tapHeart && (
              <motion.path
                d="M0,4 C0,0 -4,-4 -6,-4 C-9,-4 -9,1 -9,1 C-9,6 0,11 0,11 C0,11 9,6 9,1 C9,1 9,-4 6,-4 C4,-4 0,0 0,4 Z"
                fill="#ff6b9d"
                initial={{ x: 115, y: 10, scale: 0.3, opacity: 0 }}
                animate={{ 
                  y: -8,
                  scale: [0.3, 1.3, 1],
                  opacity: [0, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* Speech Bubble on Tap */}
        <AnimatePresence>
          {showBubble && (
            <motion.g
              initial={{ opacity: 0, y: 5, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <rect
                x="150"
                y="2"
                width="70"
                height="24"
                rx="12"
                fill="white"
                stroke="#e0e0e0"
                strokeWidth="1"
              />
              <text
                x="185"
                y="18"
                textAnchor="middle"
                fontSize="11"
                fill="#5d4037"
                fontWeight="500"
              >
                {config.tapReaction}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>

      {/* Message Only (no badge) */}
      <motion.p
        className="text-sm text-muted-foreground text-center"
        key={state}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", ...springConfig }}
      >
        {config.message}
      </motion.p>
    </div>
  );
}
