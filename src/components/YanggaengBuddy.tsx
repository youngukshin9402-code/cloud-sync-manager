import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface YanggaengBuddyProps {
  completedCount: number; // 0~4
  className?: string;
}

// 상태별 설정 - 차이 확실하게
const stateConfigs = {
  1: {
    message: "오늘은… 쉬엄쉬엄 🫠",
    tapReaction: "흐응…",
    bodyGradientStart: "#c4996a",
    bodyGradientEnd: "#a07850",
    highlightOpacity: 0.12,
    glossOpacity: 0.25,
    glowOpacity: 0,
    cheekOpacity: 0.04,
    cheekColor: "#dd9090",
    bounceY: [-1.5, 0, -1.5],
    bounceDuration: 5.2,
    scaleX: [1, 1.008, 1],
    scaleY: [1, 0.992, 1],
    shadowScale: [1, 0.97, 1],
  },
  2: {
    message: "조금만 더 해볼까? 🥺",
    tapReaction: "으음~",
    bodyGradientStart: "#d0a060",
    bodyGradientEnd: "#b08848",
    highlightOpacity: 0.16,
    glossOpacity: 0.30,
    glowOpacity: 0,
    cheekOpacity: 0.10,
    cheekColor: "#e09090",
    bounceY: [-3, 0, -3],
    bounceDuration: 4.0,
    scaleX: [1, 1.025, 1],
    scaleY: [1, 0.975, 1],
    shadowScale: [1, 0.94, 1],
  },
  3: {
    message: "좋아, 반은 했어 🙂",
    tapReaction: "좋아~",
    bodyGradientStart: "#e5a050",
    bodyGradientEnd: "#cc8c40",
    highlightOpacity: 0.20,
    glossOpacity: 0.38,
    glowOpacity: 0.04,
    cheekOpacity: 0.18,
    cheekColor: "#f09090",
    bounceY: [-6, 0, -6],
    bounceDuration: 3.0,
    scaleX: [1, 1.055, 1],
    scaleY: [1, 0.945, 1],
    shadowScale: [1, 0.88, 1],
  },
  4: {
    message: "거의 다 왔다! ✨",
    tapReaction: "파이팅!!",
    bodyGradientStart: "#f0a535",
    bodyGradientEnd: "#dd9025",
    highlightOpacity: 0.24,
    glossOpacity: 0.45,
    glowOpacity: 0.08,
    cheekOpacity: 0.30,
    cheekColor: "#ff8585",
    bounceY: [-9, 0, -9],
    bounceDuration: 2.5,
    scaleX: [1, 1.07, 1],
    scaleY: [1, 0.92, 1],
    shadowScale: [1, 0.82, 1],
  },
  5: {
    message: "완벽해! 최고야!! 💛",
    tapReaction: "최고!!",
    bodyGradientStart: "#ffb825",
    bodyGradientEnd: "#f5a015",
    highlightOpacity: 0.28,
    glossOpacity: 0.52,
    glowOpacity: 0.14,
    cheekOpacity: 0.42,
    cheekColor: "#ff7575",
    bounceY: [-12, 0, -12],
    bounceDuration: 2.0,
    scaleX: [1, 1.085, 1],
    scaleY: [1, 0.90, 1],
    shadowScale: [1, 0.75, 1],
  },
} as const;

export function YanggaengBuddy({ completedCount, className }: YanggaengBuddyProps) {
  const reducedMotion = useReducedMotion();
  const state = Math.max(1, Math.min(5, completedCount + 1)) as 1 | 2 | 3 | 4 | 5;
  const config = stateConfigs[state];
  
  // Blink 랜덤 간격
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);
  
  const scheduleBlink = useCallback(() => {
    const delay = 2200 + Math.random() * 2800;
    blinkTimeoutRef.current = window.setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        scheduleBlink();
      }, 100);
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
  const [tapHearts, setTapHearts] = useState<{ id: number; x: number }[]>([]);
  const tapIdRef = useRef(0);
  
  const handleTap = () => {
    setIsTapped(true);
    setShowBubble(true);
    
    if (state >= 4) {
      const count = state === 5 ? 2 : 1;
      const newHearts = Array.from({ length: count }, (_, i) => ({
        id: tapIdRef.current++,
        x: 100 + Math.random() * 30 + i * 20,
      }));
      setTapHearts(prev => [...prev, ...newHearts]);
      setTimeout(() => {
        setTapHearts(prev => prev.filter(h => !newHearts.some(n => n.id === h.id)));
      }, 1200);
    }
    
    setTimeout(() => setIsTapped(false), 250);
    setTimeout(() => setShowBubble(false), 1400);
  };
  
  // Effects (sparkle/heart) for state 4-5
  const [effects, setEffects] = useState<{ id: number; type: "sparkle" | "heart"; x: number; y: number }[]>([]);
  const effectIdRef = useRef(0);
  
  useEffect(() => {
    if (state < 4 || reducedMotion) return;
    
    const spawnEffect = () => {
      const count = state === 5 && Math.random() > 0.5 ? 2 : 1;
      const newEffects: typeof effects = [];
      for (let i = 0; i < count; i++) {
        newEffects.push({
          id: effectIdRef.current++,
          type: state === 5 && Math.random() > 0.3 ? "heart" : "sparkle",
          x: 55 + Math.random() * 100,
          y: 8 + Math.random() * 20,
        });
      }
      setEffects(prev => [...prev.slice(-1), ...newEffects]);
      
      setTimeout(() => {
        setEffects(prev => prev.filter(e => !newEffects.some(n => n.id === e.id)));
      }, state === 5 ? 1300 : 1000);
    };
    
    // 첫 이펙트 빠르게
    const firstDelay = 1500 + Math.random() * 1500;
    const firstTimer = setTimeout(spawnEffect, firstDelay);
    
    const interval = state === 5 ? (4000 + Math.random() * 2500) : (6000 + Math.random() * 3000);
    const timer = setInterval(spawnEffect, interval);
    
    return () => {
      clearTimeout(firstTimer);
      clearInterval(timer);
    };
  }, [state, reducedMotion]);

  const springConfig = { stiffness: 320, damping: 22, mass: 0.7 };
  
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
    scaleX: [...config.shadowScale],
    scaleY: [1, 0.85, 1],
    transition: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
  }, [config, reducedMotion]);

  // 비대칭 눈 위치 (아이콘 느낌 제거)
  const leftEyeX = 87;
  const leftEyeY = 52;
  const rightEyeX = 138;
  const rightEyeY = 54;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.svg
        viewBox="0 0 230 125"
        className="w-[200px] h-[115px] sm:w-[220px] sm:h-[125px] cursor-pointer select-none"
        onClick={handleTap}
        animate={{ scale: isTapped ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
      >
        <defs>
          <linearGradient id="jellyBody" x1="0%" y1="0%" x2="0%" y2="100%">
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
          {/* 큰 하이라이트 */}
          <radialGradient id="bigHighlight" cx="28%" cy="15%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="60%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {/* 작은 글로시 점 */}
          <radialGradient id="glossDot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shadow - 더 동적으로 */}
        <motion.ellipse
          cx="115"
          cy="113"
          rx="48"
          ry="8"
          fill="rgba(0,0,0,0.10)"
          animate={shadowAnimation}
          style={{ transformOrigin: "115px 113px" }}
        />

        {/* Body Group */}
        <motion.g
          animate={bounceAnimation}
          style={{ transformOrigin: "115px 60px" }}
        >
          {/* Glow Layer (state 3+) */}
          {state >= 3 && (
            <motion.rect
              x="52"
              y="14"
              width="126"
              height="88"
              rx="28"
              ry="28"
              fill={config.bodyGradientStart}
              animate={{ opacity: config.glowOpacity }}
              transition={{ type: "spring", ...springConfig }}
              filter="url(#softGlow)"
            />
          )}

          {/* Main Body - 약간 비대칭 라운드 */}
          <motion.rect
            x="52"
            y="14"
            width="126"
            height="88"
            rx="30"
            ry="26"
            fill="url(#jellyBody)"
          />

          {/* Big Highlight (상단) */}
          <motion.ellipse
            cx="82"
            cy="34"
            rx="32"
            ry="18"
            fill="url(#bigHighlight)"
            animate={{ opacity: config.highlightOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Small Gloss Dot 1 */}
          <motion.circle
            cx="68"
            cy="28"
            r="6"
            fill="url(#glossDot)"
            animate={{ opacity: config.glossOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Small Gloss Dot 2 (작은 점) */}
          <motion.circle
            cx="80"
            cy="38"
            r="3"
            fill="white"
            animate={{ opacity: config.glossOpacity * 0.7 }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* === EYES === */}
          {/* State 1: 반쯤 감은 눈 */}
          {state === 1 && !isBlinking && (
            <>
              <path
                d={`M ${leftEyeX - 10} ${leftEyeY + 2} Q ${leftEyeX} ${leftEyeY - 4} ${leftEyeX + 10} ${leftEyeY + 2}`}
                fill="none"
                stroke="#3d2914"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d={`M ${rightEyeX - 10} ${rightEyeY + 2} Q ${rightEyeX} ${rightEyeY - 4} ${rightEyeX + 10} ${rightEyeY + 2}`}
                fill="none"
                stroke="#3d2914"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* 눈썹 찡그림 */}
              <line x1={leftEyeX - 12} y1={leftEyeY - 12} x2={leftEyeX + 5} y2={leftEyeY - 8} stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" />
              <line x1={rightEyeX - 5} y1={rightEyeY - 10} x2={rightEyeX + 12} y2={rightEyeY - 14} stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          {/* State 2: 작고 시무룩한 눈 */}
          {state === 2 && !isBlinking && (
            <>
              <ellipse cx={leftEyeX} cy={leftEyeY} rx="6" ry="8" fill="#3d2914" />
              <ellipse cx={rightEyeX} cy={rightEyeY} rx="6" ry="8" fill="#3d2914" />
              <circle cx={leftEyeX + 2} cy={leftEyeY - 3} r="2" fill="white" opacity="0.7" />
              <circle cx={rightEyeX + 2} cy={rightEyeY - 3} r="2" fill="white" opacity="0.7" />
            </>
          )}

          {/* State 3: 기본 동그란 눈 */}
          {state === 3 && !isBlinking && (
            <>
              <ellipse cx={leftEyeX} cy={leftEyeY} rx="8" ry="10" fill="#3d2914" />
              <ellipse cx={rightEyeX} cy={rightEyeY} rx="8" ry="10" fill="#3d2914" />
              <circle cx={leftEyeX + 2} cy={leftEyeY - 3} r="2.5" fill="white" opacity="0.85" />
              <circle cx={rightEyeX + 2} cy={rightEyeY - 3} r="2.5" fill="white" opacity="0.85" />
            </>
          )}

          {/* State 4: 초롱초롱한 눈 (더 큰 하이라이트) */}
          {state === 4 && !isBlinking && (
            <>
              <ellipse cx={leftEyeX} cy={leftEyeY} rx="9" ry="11" fill="#3d2914" />
              <ellipse cx={rightEyeX} cy={rightEyeY} rx="9" ry="11" fill="#3d2914" />
              {/* 큰 하이라이트 */}
              <circle cx={leftEyeX + 3} cy={leftEyeY - 4} r="4" fill="white" opacity="0.95" />
              <circle cx={rightEyeX + 3} cy={rightEyeY - 4} r="4" fill="white" opacity="0.95" />
              {/* 작은 하이라이트 */}
              <circle cx={leftEyeX - 2} cy={leftEyeY + 2} r="2" fill="white" opacity="0.6" />
              <circle cx={rightEyeX - 2} cy={rightEyeY + 2} r="2" fill="white" opacity="0.6" />
            </>
          )}

          {/* State 5: 반달눈 (활짝 웃는 눈) */}
          {state === 5 && !isBlinking && (
            <>
              <path
                d={`M ${leftEyeX - 11} ${leftEyeY + 4} Q ${leftEyeX} ${leftEyeY - 8} ${leftEyeX + 11} ${leftEyeY + 4}`}
                fill="none"
                stroke="#3d2914"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d={`M ${rightEyeX - 11} ${rightEyeY + 4} Q ${rightEyeX} ${rightEyeY - 8} ${rightEyeX + 11} ${rightEyeY + 4}`}
                fill="none"
                stroke="#3d2914"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* 반짝임 (눈 위에) */}
              <circle cx={leftEyeX} cy={leftEyeY - 10} r="3" fill="white" opacity="0.9" />
              <circle cx={rightEyeX} cy={rightEyeY - 10} r="3" fill="white" opacity="0.9" />
              <circle cx={leftEyeX + 8} cy={leftEyeY - 6} r="1.5" fill="white" opacity="0.7" />
              <circle cx={rightEyeX + 8} cy={rightEyeY - 6} r="1.5" fill="white" opacity="0.7" />
            </>
          )}

          {/* Blinking eyes (all states) */}
          {isBlinking && (
            <>
              <line x1={leftEyeX - 8} y1={leftEyeY} x2={leftEyeX + 8} y2={leftEyeY} stroke="#3d2914" strokeWidth="3" strokeLinecap="round" />
              <line x1={rightEyeX - 8} y1={rightEyeY} x2={rightEyeX + 8} y2={rightEyeY} stroke="#3d2914" strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {/* Cheeks - 비대칭 위치 */}
          <motion.ellipse
            cx="62"
            cy="70"
            rx="15"
            ry="10"
            fill={config.cheekColor}
            animate={{ opacity: config.cheekOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />
          <motion.ellipse
            cx="168"
            cy="72"
            rx="15"
            ry="10"
            fill={config.cheekColor}
            animate={{ opacity: config.cheekOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Mouth - 상태별로 확실히 다르게 */}
          {state === 1 && (
            <path d="M 100 82 L 115 80 L 130 83" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
          )}
          {state === 2 && (
            <path d="M 102 78 Q 115 83 128 78" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
          )}
          {state === 3 && (
            <path d="M 98 76 Q 115 88 132 76" fill="none" stroke="#5d4037" strokeWidth="3.5" strokeLinecap="round" />
          )}
          {state === 4 && (
            <path d="M 94 74 Q 115 94 136 74" fill="none" stroke="#5d4037" strokeWidth="3.5" strokeLinecap="round" />
          )}
          {state === 5 && (
            <>
              <path d="M 90 72 Q 115 100 140 72" fill="none" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" />
              {/* 입 안쪽 (더 활짝) */}
              <path d="M 95 76 Q 115 92 135 76" fill="#c96048" opacity="0.4" />
            </>
          )}

          {/* Sparkle/Heart effects */}
          <AnimatePresence>
            {effects.map(effect => (
              <motion.g key={effect.id}>
                {effect.type === "sparkle" ? (
                  <motion.g
                    initial={{ x: effect.x, y: effect.y, scale: 0.3, opacity: 0 }}
                    animate={{ 
                      y: effect.y - 22,
                      scale: [0.3, 1.3, 1],
                      opacity: [0, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: state === 5 ? 1.3 : 1.0, ease: "easeOut" }}
                  >
                    <path d="M0,-8 L2,0 L0,8 L-2,0 Z" fill="#ffd700" />
                    <path d="M-8,0 L0,2 L8,0 L0,-2 Z" fill="#ffd700" />
                  </motion.g>
                ) : (
                  <motion.path
                    d="M0,4 C0,-1 -5,-5 -7,-5 C-10,-5 -10,2 -10,2 C-10,8 0,14 0,14 C0,14 10,8 10,2 C10,2 10,-5 7,-5 C5,-5 0,-1 0,4 Z"
                    fill="#ff6090"
                    initial={{ x: effect.x, y: effect.y, scale: 0.3, opacity: 0 }}
                    animate={{ 
                      y: effect.y - 25,
                      scale: [0.3, 1.2, 0.95],
                      opacity: [0, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.3, ease: "easeOut" }}
                  />
                )}
              </motion.g>
            ))}
          </AnimatePresence>

          {/* Tap Hearts */}
          <AnimatePresence>
            {tapHearts.map(heart => (
              <motion.path
                key={heart.id}
                d="M0,3 C0,-1 -4,-4 -6,-4 C-8,-4 -8,1 -8,1 C-8,5 0,10 0,10 C0,10 8,5 8,1 C8,1 8,-4 6,-4 C4,-4 0,-1 0,3 Z"
                fill="#ff6090"
                initial={{ x: heart.x, y: 5, scale: 0.2, opacity: 0 }}
                animate={{ 
                  y: -15,
                  scale: [0.2, 1.4, 1.1],
                  opacity: [0, 1, 0],
                  rotate: [0, -10, 10, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>
        </motion.g>

        {/* Speech Bubble on Tap */}
        <AnimatePresence>
          {showBubble && (
            <motion.g
              initial={{ opacity: 0, y: 8, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
            >
              <rect
                x="148"
                y="0"
                width="78"
                height="28"
                rx="14"
                fill="white"
                stroke="#e8e8e8"
                strokeWidth="1.5"
              />
              {/* 말풍선 꼬리 */}
              <polygon points="155,28 162,36 168,28" fill="white" />
              <text
                x="187"
                y="19"
                textAnchor="middle"
                fontSize="13"
                fill="#5d4037"
                fontWeight="600"
              >
                {config.tapReaction}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>

      {/* Message */}
      <motion.p
        className="text-sm text-muted-foreground text-center font-medium"
        key={state}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {config.message}
      </motion.p>
    </div>
  );
}
