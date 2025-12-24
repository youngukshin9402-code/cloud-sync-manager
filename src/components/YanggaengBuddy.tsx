import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { motion, useReducedMotion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface YanggaengBuddyProps {
  completedCount: number; // 0~4
  className?: string;
}

// 상태별 설정
const stateConfigs = {
  1: {
    message: "오늘은… 쉬엄쉬엄 🫠",
    badge: { text: "휴식중 💤", bg: "bg-muted/60", glow: false },
    bodyColor: "#d4a574",
    bodyGradientStart: "#d4a574",
    bodyGradientEnd: "#b8956a",
    highlightOpacity: 0.25,
    glowOpacity: 0,
    cheekOpacity: 0,
    bounceY: [-1, 0, -1],
    bounceDuration: 4.5,
    wiggle: [-1, 1, 0],
    wiggleDuration: 6.0,
  },
  2: {
    message: "조금만 더 해볼까? 🥺",
    badge: { text: "시동중 🥺", bg: "bg-amber-100/60", glow: false },
    bodyColor: "#daa06d",
    bodyGradientStart: "#daa06d",
    bodyGradientEnd: "#c49660",
    highlightOpacity: 0.35,
    glowOpacity: 0,
    cheekOpacity: 0.15,
    bounceY: [-2, 0, -2],
    bounceDuration: 4.0,
    wiggle: [-1.5, 1.5, 0],
    wiggleDuration: 5.5,
  },
  3: {
    message: "좋아, 반은 했어 🙂",
    badge: { text: "안정 🙂", bg: "bg-green-100/60", glow: false },
    bodyColor: "#e8a854",
    bodyGradientStart: "#e8a854",
    bodyGradientEnd: "#d49545",
    highlightOpacity: 0.45,
    glowOpacity: 0.05,
    cheekOpacity: 0.35,
    bounceY: [-4, 0, -4],
    bounceDuration: 3.2,
    wiggle: [0, 0, 0],
    wiggleDuration: 5.0,
  },
  4: {
    message: "거의 다 왔다! ✨",
    badge: { text: "상승 ✨", bg: "bg-yellow-100/70", glow: false },
    bodyColor: "#f0a830",
    bodyGradientStart: "#f0a830",
    bodyGradientEnd: "#e09520",
    highlightOpacity: 0.55,
    glowOpacity: 0.08,
    cheekOpacity: 0.5,
    bounceY: [-6, 0, -6],
    bounceDuration: 2.7,
    wiggle: [0, 0, 0],
    wiggleDuration: 5.0,
  },
  5: {
    message: "완벽해! 최고야!! 💛",
    badge: { text: "최고 💛", bg: "bg-amber-200/80", glow: true },
    bodyColor: "#ffb020",
    bodyGradientStart: "#ffb020",
    bodyGradientEnd: "#f5a010",
    highlightOpacity: 0.65,
    glowOpacity: 0.12,
    cheekOpacity: 0.7,
    bounceY: [-9, 0, -9],
    bounceDuration: 2.2,
    wiggle: [0, 0, 0],
    wiggleDuration: 5.0,
  },
} as const;

// 눈 모양 상태별
const eyeShapes = {
  1: { type: "flat", scaleY: 0.5 }, // 찡그림
  2: { type: "half", scaleY: 0.7 },
  3: { type: "normal", scaleY: 1 },
  4: { type: "happy", scaleY: 0.85 },
  5: { type: "sparkle", scaleY: 0.8 },
};

// 입 모양 상태별
const mouthShapes = {
  1: "M 85 95 Q 110 92 135 95", // 일자/삐죽
  2: "M 88 93 Q 110 96 132 93", // 살짝 아래
  3: "M 90 90 Q 110 98 130 90", // 미소
  4: "M 88 88 Q 110 102 132 88", // 활짝
  5: "M 85 85 Q 110 108 135 85", // 완전 활짝
};

// 눈썹 상태별
const eyebrowAngles = {
  1: -12, // 찡그림
  2: -6,
  3: 0,
  4: 3,
  5: 5,
};

export function YanggaengBuddy({ completedCount, className }: YanggaengBuddyProps) {
  const reducedMotion = useReducedMotion();
  const state = Math.max(1, Math.min(5, completedCount + 1)) as 1 | 2 | 3 | 4 | 5;
  const config = stateConfigs[state];
  
  // Blink 랜덤 간격
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);
  
  const scheduleBlink = useCallback(() => {
    const delay = 3000 + Math.random() * 2500; // 3.0s ~ 5.5s
    blinkTimeoutRef.current = window.setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        scheduleBlink();
      }, 140); // 0.14s blink duration
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
  
  // Effects (sparkle/heart) for state 4-5
  const [effects, setEffects] = useState<{ id: number; type: "sparkle" | "heart"; x: number; y: number }[]>([]);
  const effectIdRef = useRef(0);
  
  useEffect(() => {
    if (state < 4 || reducedMotion) return;
    
    const interval = state === 5 ? (5000 + Math.random() * 3000) : (7000 + Math.random() * 3000);
    
    const spawnEffect = () => {
      const count = Math.random() > 0.5 ? 2 : 1;
      const newEffects: typeof effects = [];
      for (let i = 0; i < count; i++) {
        newEffects.push({
          id: effectIdRef.current++,
          type: state === 5 && Math.random() > 0.5 ? "heart" : "sparkle",
          x: 80 + Math.random() * 60,
          y: 20 + Math.random() * 30,
        });
      }
      setEffects(prev => [...prev.slice(-2), ...newEffects]); // Max 2
      
      setTimeout(() => {
        setEffects(prev => prev.filter(e => !newEffects.some(n => n.id === e.id)));
      }, state === 5 ? 1100 : 900);
    };
    
    const timer = setInterval(spawnEffect, interval);
    return () => clearInterval(timer);
  }, [state, reducedMotion]);
  
  // Sigh effect for state 1
  const [sighEffects, setSighEffects] = useState<{ id: number; x: number }[]>([]);
  
  useEffect(() => {
    if (state !== 1 || reducedMotion) return;
    
    const spawnSigh = () => {
      const id = effectIdRef.current++;
      setSighEffects(prev => [...prev.slice(-1), { id, x: 130 + Math.random() * 20 }]);
      setTimeout(() => {
        setSighEffects(prev => prev.filter(e => e.id !== id));
      }, 900);
    };
    
    const delay = 8000 + Math.random() * 4000;
    const timer = setInterval(spawnSigh, delay);
    return () => clearInterval(timer);
  }, [state, reducedMotion]);
  
  // Spring for state transition
  const springConfig = { stiffness: 260, damping: 18, mass: 0.8 };
  const bodyColorSpring = useSpring(0, springConfig);
  const [popScale, setPopScale] = useState(1);
  
  useEffect(() => {
    bodyColorSpring.set(state);
    // Pop effect on state change
    setPopScale(1.04);
    const timer = setTimeout(() => setPopScale(1), 220);
    return () => clearTimeout(timer);
  }, [state, bodyColorSpring]);

  const bounceAnimation = useMemo(() => reducedMotion ? {} : {
    y: [...config.bounceY],
    rotate: [...config.wiggle],
    scaleX: state === 5 ? [1, 1.06, 1] : [1, 1, 1],
    scaleY: state === 5 ? [1, 0.94, 1] : [1, 1, 1],
    transition: {
      y: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
      rotate: { duration: config.wiggleDuration, repeat: Infinity, ease: "easeInOut" as const },
      scaleX: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
      scaleY: { duration: config.bounceDuration, repeat: Infinity, ease: "easeInOut" as const },
    },
  }, [config, state, reducedMotion]);

  const shadowAnimation = useMemo(() => reducedMotion ? {} : {
    scaleX: [1, 0.92, 1],
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
  }, [reducedMotion]);

  const eyeScaleY = isBlinking ? 0.12 : eyeShapes[state].scaleY;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.svg
        viewBox="0 0 220 140"
        className="w-[200px] h-[130px] sm:w-[220px] sm:h-[140px]"
        initial={false}
        animate={{ scale: popScale }}
        transition={{ type: "spring", ...springConfig }}
      >
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
          <radialGradient id="glossGradient" cx="30%" cy="20%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.8" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shadow */}
        <motion.ellipse
          cx="110"
          cy="130"
          rx="55"
          ry="8"
          fill="rgba(0,0,0,0.15)"
          animate={shadowAnimation}
        />

        {/* Body Group with bounce */}
        <motion.g
          animate={bounceAnimation}
          style={{ originX: "110px", originY: "70px" }}
        >
          {/* Glow (state 3+) */}
          {state >= 3 && (
            <motion.ellipse
              cx="110"
              cy="70"
              rx="65"
              ry="50"
              fill={config.bodyColor}
              animate={{ opacity: config.glowOpacity }}
              transition={{ type: "spring", ...springConfig }}
              filter="url(#glow)"
            />
          )}

          {/* Body */}
          <motion.rect
            x="45"
            y="25"
            width="130"
            height="90"
            rx="45"
            ry="45"
            fill="url(#bodyGradient)"
            animate={{ fill: "url(#bodyGradient)" }}
          />

          {/* Highlight */}
          <motion.ellipse
            cx="80"
            cy="45"
            rx="25"
            ry="15"
            fill="url(#glossGradient)"
            animate={{ opacity: config.highlightOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Eyebrows (state 1-2) */}
          {state <= 2 && (
            <>
              <motion.line
                x1="70"
                y1="48"
                x2="85"
                y2="50"
                stroke="#5d4037"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{ rotate: eyebrowAngles[state] }}
                style={{ transformOrigin: "77px 49px" }}
                transition={{ type: "spring", ...springConfig }}
              />
              <motion.line
                x1="135"
                y1="50"
                x2="150"
                y2="48"
                stroke="#5d4037"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{ rotate: -eyebrowAngles[state] }}
                style={{ transformOrigin: "142px 49px" }}
                transition={{ type: "spring", ...springConfig }}
              />
            </>
          )}

          {/* Eyes */}
          <motion.ellipse
            cx="80"
            cy="60"
            rx="8"
            ry="10"
            fill="#3d2914"
            animate={{ scaleY: eyeScaleY }}
            transition={{ duration: isBlinking ? 0.07 : 0.2 }}
            style={{ transformOrigin: "80px 60px" }}
          />
          <motion.ellipse
            cx="140"
            cy="60"
            rx="8"
            ry="10"
            fill="#3d2914"
            animate={{ scaleY: eyeScaleY }}
            transition={{ duration: isBlinking ? 0.07 : 0.2 }}
            style={{ transformOrigin: "140px 60px" }}
          />

          {/* Eye sparkles (state 5) */}
          {state === 5 && !isBlinking && (
            <>
              <circle cx="83" cy="56" r="2.5" fill="white" opacity="0.9" />
              <circle cx="143" cy="56" r="2.5" fill="white" opacity="0.9" />
            </>
          )}

          {/* Cheeks */}
          <motion.ellipse
            cx="60"
            cy="75"
            rx="12"
            ry="8"
            fill="#ff9f9f"
            animate={{ opacity: config.cheekOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />
          <motion.ellipse
            cx="160"
            cy="75"
            rx="12"
            ry="8"
            fill="#ff9f9f"
            animate={{ opacity: config.cheekOpacity }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Mouth */}
          <motion.path
            d={mouthShapes[state]}
            fill="none"
            stroke="#5d4037"
            strokeWidth="3"
            strokeLinecap="round"
            initial={false}
            animate={{ d: mouthShapes[state] }}
            transition={{ type: "spring", ...springConfig }}
          />

          {/* Sigh effects (state 1) */}
          <AnimatePresence>
            {sighEffects.map(effect => (
              <motion.g key={effect.id}>
                <motion.path
                  d={`M ${effect.x} 30 Q ${effect.x + 5} 25 ${effect.x + 10} 30`}
                  fill="none"
                  stroke="#999"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -10, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </motion.g>
            ))}
          </AnimatePresence>

          {/* Sparkle/Heart effects (state 4-5) */}
          <AnimatePresence>
            {effects.map(effect => (
              <motion.g key={effect.id}>
                {effect.type === "sparkle" ? (
                  <motion.path
                    d="M0,-6 L1.5,0 L0,6 L-1.5,0 Z M-6,0 L0,1.5 L6,0 L0,-1.5 Z"
                    fill="#ffd700"
                    initial={{ x: effect.x, y: effect.y, scale: 0.6, opacity: 0 }}
                    animate={{ 
                      y: effect.y - (state === 5 ? 18 : 10),
                      scale: [0.6, 1.1, 0.8],
                      opacity: [0, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: state === 5 ? 1.1 : 0.9, ease: "easeOut" }}
                  />
                ) : (
                  <motion.path
                    d="M0,3 C0,0 -3,-3 -5,-3 C-8,-3 -8,1 -8,1 C-8,5 0,9 0,9 C0,9 8,5 8,1 C8,1 8,-3 5,-3 C3,-3 0,0 0,3 Z"
                    fill="#ff6b9d"
                    initial={{ x: effect.x, y: effect.y, scale: 0.5, opacity: 0 }}
                    animate={{ 
                      y: effect.y - 18,
                      scale: [0.5, 1, 0.8],
                      opacity: [0, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                )}
              </motion.g>
            ))}
          </AnimatePresence>
        </motion.g>
      </motion.svg>

      {/* Message + Badge */}
      <div className="flex items-center gap-2">
        <motion.p
          className="text-sm text-muted-foreground text-center"
          key={state}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", ...springConfig }}
        >
          {config.message}
        </motion.p>
        <motion.span
          className={cn(
            "px-2 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap",
            config.badge.bg,
            config.badge.glow && "shadow-[0_0_8px_rgba(255,176,32,0.25)]"
          )}
          key={`badge-${state}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", ...springConfig }}
        >
          {config.badge.text}
        </motion.span>
      </div>
    </div>
  );
}
