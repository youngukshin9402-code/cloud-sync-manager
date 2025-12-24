import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface YanggaengBuddyProps {
  completedCount: number; // 0~4
  className?: string;
}

// 상태별 설정 - 3D 입체감 강조
const stateConfigs = {
  1: {
    message: "오늘은… 쉬엄쉬엄 🫠",
    tapReaction: "흐응…",
    // 3톤 분리: 윗면 / 앞면 / 하단
    topColor: "#d4a878",
    midColor: "#c49668",
    bottomColor: "#9a7048",
    // 내부 젤리 투명층
    innerGlow: "#e8c090",
    highlightOpacity: 0.35,
    glossOpacity: 0.55,
    glowOpacity: 0,
    cheekOpacity: 0.06,
    cheekColor: "#cc8080",
    shadowOpacity: 0.18,
    bounceY: [-1.5, 0, -1.5],
    bounceDuration: 5.0,
    scaleX: [1, 1.01, 1],
    scaleY: [1, 0.99, 1],
    shadowScale: [1, 0.96, 1],
  },
  2: {
    message: "조금만 더 해볼까? 🥺",
    tapReaction: "으음~",
    topColor: "#ddb070",
    midColor: "#cc9c5c",
    bottomColor: "#a67840",
    innerGlow: "#f0c890",
    highlightOpacity: 0.42,
    glossOpacity: 0.60,
    glowOpacity: 0,
    cheekOpacity: 0.12,
    cheekColor: "#dd8888",
    shadowOpacity: 0.22,
    bounceY: [-3, 0, -3],
    bounceDuration: 4.0,
    scaleX: [1, 1.03, 1],
    scaleY: [1, 0.97, 1],
    shadowScale: [1, 0.92, 1],
  },
  3: {
    message: "좋아, 반은 했어 🙂",
    tapReaction: "좋아~",
    topColor: "#f0b860",
    midColor: "#dda048",
    bottomColor: "#b07830",
    innerGlow: "#ffd898",
    highlightOpacity: 0.50,
    glossOpacity: 0.68,
    glowOpacity: 0.05,
    cheekOpacity: 0.20,
    cheekColor: "#ee8585",
    shadowOpacity: 0.26,
    bounceY: [-6, 0, -6],
    bounceDuration: 3.0,
    scaleX: [1, 1.06, 1],
    scaleY: [1, 0.94, 1],
    shadowScale: [1, 0.85, 1],
  },
  4: {
    message: "거의 다 왔다! ✨",
    tapReaction: "파이팅!!",
    topColor: "#ffc050",
    midColor: "#f0a838",
    bottomColor: "#c08020",
    innerGlow: "#ffe0a0",
    highlightOpacity: 0.58,
    glossOpacity: 0.75,
    glowOpacity: 0.10,
    cheekOpacity: 0.32,
    cheekColor: "#ff7878",
    shadowOpacity: 0.30,
    bounceY: [-9, 0, -9],
    bounceDuration: 2.4,
    scaleX: [1, 1.08, 1],
    scaleY: [1, 0.91, 1],
    shadowScale: [1, 0.78, 1],
  },
  5: {
    message: "완벽해! 최고야!! 💛",
    tapReaction: "최고!!",
    topColor: "#ffd060",
    midColor: "#ffb830",
    bottomColor: "#d09018",
    innerGlow: "#fff0b8",
    highlightOpacity: 0.65,
    glossOpacity: 0.85,
    glowOpacity: 0.18,
    cheekOpacity: 0.48,
    cheekColor: "#ff6868",
    shadowOpacity: 0.35,
    bounceY: [-13, 0, -13],
    bounceDuration: 1.9,
    scaleX: [1, 1.10, 1],
    scaleY: [1, 0.88, 1],
    shadowScale: [1, 0.68, 1],
  },
} as const;

export function YanggaengBuddy({ completedCount, className }: YanggaengBuddyProps) {
  const reducedMotion = useReducedMotion();
  const state = Math.max(1, Math.min(5, completedCount + 1)) as 1 | 2 | 3 | 4 | 5;
  const config = stateConfigs[state];
  
  // Blink
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);
  
  const scheduleBlink = useCallback(() => {
    const delay = 2000 + Math.random() * 2500;
    blinkTimeoutRef.current = window.setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        scheduleBlink();
      }, 90);
    }, delay);
  }, []);
  
  useEffect(() => {
    if (!reducedMotion) scheduleBlink();
    return () => { if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current); };
  }, [scheduleBlink, reducedMotion]);
  
  // Tap
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
        x: 95 + Math.random() * 40 + i * 15,
      }));
      setTapHearts(prev => [...prev, ...newHearts]);
      setTimeout(() => setTapHearts(prev => prev.filter(h => !newHearts.some(n => n.id === h.id))), 1300);
    }
    setTimeout(() => setIsTapped(false), 280);
    setTimeout(() => setShowBubble(false), 1500);
  };
  
  // Effects
  const [effects, setEffects] = useState<{ id: number; type: "sparkle" | "heart"; x: number; y: number }[]>([]);
  const effectIdRef = useRef(0);
  
  useEffect(() => {
    if (state < 4 || reducedMotion) return;
    const spawnEffect = () => {
      const count = state === 5 && Math.random() > 0.4 ? 2 : 1;
      const newEffects = Array.from({ length: count }, () => ({
        id: effectIdRef.current++,
        type: (state === 5 && Math.random() > 0.35 ? "heart" : "sparkle") as "sparkle" | "heart",
        x: 50 + Math.random() * 110,
        y: 5 + Math.random() * 18,
      }));
      setEffects(prev => [...prev.slice(-1), ...newEffects]);
      setTimeout(() => setEffects(prev => prev.filter(e => !newEffects.some(n => n.id === e.id))), 1400);
    };
    const firstTimer = setTimeout(spawnEffect, 1200 + Math.random() * 1000);
    const interval = state === 5 ? (3500 + Math.random() * 2000) : (5500 + Math.random() * 2500);
    const timer = setInterval(spawnEffect, interval);
    return () => { clearTimeout(firstTimer); clearInterval(timer); };
  }, [state, reducedMotion]);

  const springConfig = { stiffness: 340, damping: 24, mass: 0.65 };
  
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
    opacity: [config.shadowOpacity, config.shadowOpacity * 1.3, config.shadowOpacity],
    transition: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
  }, [config, reducedMotion]);

  // 비대칭 눈 위치
  const leftEyeX = 86;
  const leftEyeY = 50;
  const rightEyeX = 139;
  const rightEyeY = 52;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.svg
        viewBox="0 0 230 125"
        className="w-[200px] h-[115px] sm:w-[220px] sm:h-[125px] cursor-pointer select-none"
        onClick={handleTap}
        animate={{ scale: isTapped ? 1.09 : 1 }}
        transition={{ type: "spring", stiffness: 450, damping: 16 }}
      >
        <defs>
          {/* 3D 바디 그라데이션 - 3톤 분리 */}
          <linearGradient id="body3D" x1="0%" y1="0%" x2="0%" y2="100%">
            <motion.stop offset="0%" animate={{ stopColor: config.topColor }} transition={{ type: "spring", ...springConfig }} />
            <motion.stop offset="45%" animate={{ stopColor: config.midColor }} transition={{ type: "spring", ...springConfig }} />
            <motion.stop offset="100%" animate={{ stopColor: config.bottomColor }} transition={{ type: "spring", ...springConfig }} />
          </linearGradient>
          
          {/* 내부 젤리 투명층 (속이 살짝 보이는 느낌) */}
          <radialGradient id="innerJelly" cx="50%" cy="40%" r="60%">
            <motion.stop offset="0%" animate={{ stopColor: config.innerGlow }} transition={{ type: "spring", ...springConfig }} stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          
          {/* 상단 메인 하이라이트 (형태감 있게) */}
          <linearGradient id="topHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="50%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          
          {/* 글로시 반짝 점 */}
          <radialGradient id="glossPoint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          
          {/* 바닥 그림자 (중앙 진하고 바깥 퍼짐) */}
          <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          
          {/* Glow 필터 */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 바닥 그림자 - 더 좁고 진하게 */}
        <motion.ellipse
          cx="115"
          cy="114"
          rx="42"
          ry="7"
          fill="url(#groundShadow)"
          animate={shadowAnimation}
          style={{ transformOrigin: "115px 114px" }}
        />

        {/* Body Group */}
        <motion.g
          animate={bounceAnimation}
          style={{ transformOrigin: "115px 58px" }}
        >
          {/* Outer Glow (state 3+) */}
          {state >= 3 && (
            <motion.rect
              x="50"
              y="12"
              width="130"
              height="90"
              rx="30"
              ry="28"
              fill={config.topColor}
              animate={{ opacity: config.glowOpacity }}
              transition={{ type: "spring", ...springConfig }}
              filter="url(#softGlow)"
            />
          )}

          {/* === 3D 바디 구조 === */}
          {/* 메인 바디 */}
          <rect
            x="50"
            y="12"
            width="130"
            height="90"
            rx="30"
            ry="28"
            fill="url(#body3D)"
          />
          
          {/* 내부 젤리 투명층 (2겹) */}
          <ellipse
            cx="115"
            cy="52"
            rx="55"
            ry="38"
            fill="url(#innerJelly)"
            opacity="0.6"
          />
          <ellipse
            cx="110"
            cy="48"
            rx="40"
            ry="28"
            fill="url(#innerJelly)"
            opacity="0.4"
          />

          {/* 하단 어둡게 (입체감) */}
          <path
            d="M 55 75 Q 55 102 80 102 L 150 102 Q 175 102 175 75 Q 175 85 115 88 Q 55 85 55 75 Z"
            fill={config.bottomColor}
            opacity="0.5"
          />

          {/* === 상단 하이라이트 영역 === */}
          {/* 메인 하이라이트 (형태감 있게) */}
          <motion.ellipse
            cx="88"
            cy="28"
            rx="38"
            ry="14"
            fill="url(#topHighlight)"
            animate={{ opacity: config.highlightOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />
          
          {/* 보조 하이라이트 (윤곽) */}
          <motion.path
            d="M 60 35 Q 70 22 95 20 Q 120 18 140 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ opacity: config.highlightOpacity * 0.5 }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* 글로시 반짝 점들 */}
          <motion.circle
            cx="68"
            cy="26"
            r="7"
            fill="url(#glossPoint)"
            animate={{ opacity: config.glossOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />
          <motion.circle
            cx="82"
            cy="34"
            r="4"
            fill="white"
            animate={{ opacity: config.glossOpacity * 0.8 }}
            transition={{ type: "spring", ...springConfig }}
          />
          <motion.circle
            cx="72"
            cy="40"
            r="2"
            fill="white"
            animate={{ opacity: config.glossOpacity * 0.6 }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* === EYES === */}
          {state === 1 && !isBlinking && (
            <>
              <path d={`M ${leftEyeX - 10} ${leftEyeY + 3} Q ${leftEyeX} ${leftEyeY - 5} ${leftEyeX + 10} ${leftEyeY + 3}`} fill="none" stroke="#3a2815" strokeWidth="4" strokeLinecap="round" />
              <path d={`M ${rightEyeX - 10} ${rightEyeY + 3} Q ${rightEyeX} ${rightEyeY - 5} ${rightEyeX + 10} ${rightEyeY + 3}`} fill="none" stroke="#3a2815" strokeWidth="4" strokeLinecap="round" />
              <line x1={leftEyeX - 13} y1={leftEyeY - 14} x2={leftEyeX + 6} y2={leftEyeY - 9} stroke="#5a4030" strokeWidth="3" strokeLinecap="round" />
              <line x1={rightEyeX - 6} y1={rightEyeY - 11} x2={rightEyeX + 13} y2={rightEyeY - 16} stroke="#5a4030" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
          {state === 2 && !isBlinking && (
            <>
              <ellipse cx={leftEyeX} cy={leftEyeY} rx="6" ry="9" fill="#3a2815" />
              <ellipse cx={rightEyeX} cy={rightEyeY} rx="6" ry="9" fill="#3a2815" />
              <circle cx={leftEyeX + 2} cy={leftEyeY - 3} r="2.5" fill="white" opacity="0.75" />
              <circle cx={rightEyeX + 2} cy={rightEyeY - 3} r="2.5" fill="white" opacity="0.75" />
            </>
          )}
          {state === 3 && !isBlinking && (
            <>
              <ellipse cx={leftEyeX} cy={leftEyeY} rx="8" ry="11" fill="#3a2815" />
              <ellipse cx={rightEyeX} cy={rightEyeY} rx="8" ry="11" fill="#3a2815" />
              <circle cx={leftEyeX + 3} cy={leftEyeY - 4} r="3" fill="white" opacity="0.9" />
              <circle cx={rightEyeX + 3} cy={rightEyeY - 4} r="3" fill="white" opacity="0.9" />
            </>
          )}
          {state === 4 && !isBlinking && (
            <>
              <ellipse cx={leftEyeX} cy={leftEyeY} rx="10" ry="12" fill="#3a2815" />
              <ellipse cx={rightEyeX} cy={rightEyeY} rx="10" ry="12" fill="#3a2815" />
              <circle cx={leftEyeX + 3} cy={leftEyeY - 5} r="4.5" fill="white" />
              <circle cx={rightEyeX + 3} cy={rightEyeY - 5} r="4.5" fill="white" />
              <circle cx={leftEyeX - 2} cy={leftEyeY + 3} r="2" fill="white" opacity="0.7" />
              <circle cx={rightEyeX - 2} cy={rightEyeY + 3} r="2" fill="white" opacity="0.7" />
            </>
          )}
          {state === 5 && !isBlinking && (
            <>
              {/* 반달눈 - 더 과장 */}
              <path d={`M ${leftEyeX - 13} ${leftEyeY + 6} Q ${leftEyeX} ${leftEyeY - 12} ${leftEyeX + 13} ${leftEyeY + 6}`} fill="none" stroke="#3a2815" strokeWidth="5" strokeLinecap="round" />
              <path d={`M ${rightEyeX - 13} ${rightEyeY + 6} Q ${rightEyeX} ${rightEyeY - 12} ${rightEyeX + 13} ${rightEyeY + 6}`} fill="none" stroke="#3a2815" strokeWidth="5" strokeLinecap="round" />
              {/* 빛 연출 */}
              <circle cx={leftEyeX} cy={leftEyeY - 14} r="4" fill="white" opacity="0.95" />
              <circle cx={rightEyeX} cy={rightEyeY - 14} r="4" fill="white" opacity="0.95" />
              <circle cx={leftEyeX + 10} cy={leftEyeY - 8} r="2" fill="white" opacity="0.8" />
              <circle cx={rightEyeX + 10} cy={rightEyeY - 8} r="2" fill="white" opacity="0.8" />
            </>
          )}
          {isBlinking && (
            <>
              <line x1={leftEyeX - 9} y1={leftEyeY} x2={leftEyeX + 9} y2={leftEyeY} stroke="#3a2815" strokeWidth="3.5" strokeLinecap="round" />
              <line x1={rightEyeX - 9} y1={rightEyeY} x2={rightEyeX + 9} y2={rightEyeY} stroke="#3a2815" strokeWidth="3.5" strokeLinecap="round" />
            </>
          )}

          {/* Cheeks - 더 진하게 (state5) */}
          <motion.ellipse cx="58" cy="70" rx="16" ry="11" fill={config.cheekColor} animate={{ opacity: config.cheekOpacity }} transition={{ type: "spring", ...springConfig }} />
          <motion.ellipse cx="172" cy="72" rx="16" ry="11" fill={config.cheekColor} animate={{ opacity: config.cheekOpacity }} transition={{ type: "spring", ...springConfig }} />

          {/* Mouth */}
          {state === 1 && <path d="M 100 82 L 115 79 L 130 83" fill="none" stroke="#5a4030" strokeWidth="3.5" strokeLinecap="round" />}
          {state === 2 && <path d="M 102 78 Q 115 84 128 78" fill="none" stroke="#5a4030" strokeWidth="3.5" strokeLinecap="round" />}
          {state === 3 && <path d="M 96 76 Q 115 90 134 76" fill="none" stroke="#5a4030" strokeWidth="4" strokeLinecap="round" />}
          {state === 4 && <path d="M 92 74 Q 115 96 138 74" fill="none" stroke="#5a4030" strokeWidth="4" strokeLinecap="round" />}
          {state === 5 && (
            <>
              <path d="M 88 72 Q 115 105 142 72" fill="none" stroke="#5a4030" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M 94 78 Q 115 96 136 78" fill="#c45840" opacity="0.45" />
            </>
          )}

          {/* Effects - 빛 연출처럼 */}
          <AnimatePresence>
            {effects.map(effect => (
              <motion.g key={effect.id}>
                {effect.type === "sparkle" ? (
                  <motion.g
                    initial={{ x: effect.x, y: effect.y, scale: 0.2, opacity: 0 }}
                    animate={{ y: effect.y - 28, scale: [0.2, 1.4, 1.1], opacity: [0, 1, 0], rotate: [0, 15, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  >
                    <path d="M0,-9 L2.5,0 L0,9 L-2.5,0 Z" fill="#fff8d0" />
                    <path d="M-9,0 L0,2.5 L9,0 L0,-2.5 Z" fill="#fff8d0" />
                    <circle cx="0" cy="0" r="3" fill="white" opacity="0.8" />
                  </motion.g>
                ) : (
                  <motion.path
                    d="M0,5 C0,-2 -6,-6 -8,-6 C-11,-6 -11,2 -11,2 C-11,9 0,16 0,16 C0,16 11,9 11,2 C11,2 11,-6 8,-6 C6,-6 0,-2 0,5 Z"
                    fill="#ff6090"
                    initial={{ x: effect.x, y: effect.y, scale: 0.2, opacity: 0 }}
                    animate={{ y: effect.y - 30, scale: [0.2, 1.3, 1], opacity: [0, 1, 0], rotate: [-5, 5, -5] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
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
                d="M0,4 C0,-1 -5,-5 -7,-5 C-9,-5 -9,2 -9,2 C-9,7 0,13 0,13 C0,13 9,7 9,2 C9,2 9,-5 7,-5 C5,-5 0,-1 0,4 Z"
                fill="#ff6090"
                initial={{ x: heart.x, y: 2, scale: 0.15, opacity: 0 }}
                animate={{ y: -20, scale: [0.15, 1.5, 1.2], opacity: [0, 1, 0], rotate: [-15, 15, -10, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>
        </motion.g>

        {/* Speech Bubble */}
        <AnimatePresence>
          {showBubble && (
            <motion.g
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <rect x="145" y="-2" width="82" height="30" rx="15" fill="white" stroke="#e0e0e0" strokeWidth="1.5" />
              <polygon points="152,28 160,38 166,28" fill="white" />
              <text x="186" y="18" textAnchor="middle" fontSize="14" fill="#5a4030" fontWeight="600">
                {config.tapReaction}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>

      <motion.p
        className="text-sm text-muted-foreground text-center font-medium"
        key={state}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        {config.message}
      </motion.p>
    </div>
  );
}
