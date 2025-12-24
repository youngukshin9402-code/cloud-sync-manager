import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Flame, Droplets, Footprints, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  type: "inbody" | "calories" | "steps" | "water";
  // InBody
  actualAge?: number | null;
  healthAge?: number | null;
  hasInbodyData?: boolean;
  // Calories
  currentCalories?: number;
  calorieGoal?: number;
  caloriesLoading?: boolean;
  // Steps
  currentSteps?: number;
  stepsGoal?: number;
  // Water
  currentWater?: number;
  waterGoal?: number;
}

const CARD_CONFIG = {
  inbody: {
    icon: Heart,
    label: "신체 나이",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    link: "/health-checkup",
  },
  calories: {
    icon: Flame,
    label: "총 칼로리",
    color: "text-health-orange",
    bgColor: "bg-health-orange/10",
    link: "/nutrition",
  },
  steps: {
    icon: Footprints,
    label: "걸음 수",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    link: "/exercise",
  },
  water: {
    icon: Droplets,
    label: "물",
    color: "text-health-blue",
    bgColor: "bg-health-blue/10",
    link: "/water",
  },
};

export function SummaryCard({
  type,
  actualAge,
  healthAge,
  hasInbodyData,
  currentCalories = 0,
  calorieGoal = 0,
  caloriesLoading = false,
  currentSteps = 0,
  stepsGoal = 10000,
  currentWater = 0,
  waterGoal = 2000,
}: SummaryCardProps) {
  const config = CARD_CONFIG[type];
  const Icon = config.icon;

  // 달성 여부 계산
  let isAchieved = false;
  let progress = 0;

  if (type === "inbody") {
    isAchieved = hasInbodyData === true;
    progress = hasInbodyData ? 100 : 0;
  } else if (type === "calories") {
    isAchieved = calorieGoal > 0 && currentCalories >= calorieGoal;
    progress = calorieGoal > 0 ? Math.min((currentCalories / calorieGoal) * 100, 100) : 0;
  } else if (type === "steps") {
    isAchieved = currentSteps >= stepsGoal;
    progress = stepsGoal > 0 ? Math.min((currentSteps / stepsGoal) * 100, 100) : 0;
  } else if (type === "water") {
    isAchieved = currentWater >= waterGoal;
    progress = waterGoal > 0 ? Math.min((currentWater / waterGoal) * 100, 100) : 0;
  }

  // 인바디 카드 전용 렌더링
  if (type === "inbody") {
    return (
      <Link to={config.link} className="block h-full">
        <div className="bg-card rounded-xl border border-border p-2 hover:shadow-md transition-shadow h-full min-h-[88px] flex flex-col relative">
          {isAchieved && (
            <Badge className="absolute top-1.5 right-1.5 bg-health-green text-white text-[10px] px-1.5 py-0 h-4">
              달성
            </Badge>
          )}
          
          <div className="flex items-center gap-1.5 mb-1">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
              <Icon className={cn("w-3 h-3", config.color)} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground truncate">
              {config.label}
            </span>
          </div>

          {/* 수치 영역 */}
          <div className="flex items-baseline justify-center gap-1 flex-1">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {hasInbodyData && actualAge ? actualAge : "-"}
            </span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {hasInbodyData && healthAge ? healthAge : "-"}
            </span>
          </div>

          {/* 라벨 - 한 줄로 표시 */}
          <p className="text-[10px] font-medium text-muted-foreground text-center whitespace-nowrap mt-auto">
            현재 나이 / 신체 나이
          </p>
        </div>
      </Link>
    );
  }

  // 일반 카드 렌더링 (칼로리, 걸음 수, 물)
  let mainValue = "";
  let subValue = "";

  if (type === "calories") {
    mainValue = caloriesLoading ? "…" : `${currentCalories.toLocaleString()}`;
    subValue = `/${calorieGoal.toLocaleString()}kcal`;
  } else if (type === "steps") {
    mainValue = currentSteps.toLocaleString();
    subValue = `/${stepsGoal.toLocaleString()}`;
  } else if (type === "water") {
    mainValue = `${currentWater}`;
    subValue = `/${waterGoal}ml`;
  }

  return (
    <Link to={config.link} className="block h-full">
      <div className="bg-card rounded-xl border border-border p-2 hover:shadow-md transition-shadow h-full min-h-[88px] flex flex-col relative">
        {isAchieved && (
          <Badge className="absolute top-1.5 right-1.5 bg-health-green text-white text-[10px] px-1.5 py-0 h-4">
            달성
          </Badge>
        )}
        
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
            <Icon className={cn("w-3 h-3", config.color)} />
          </div>
          <span className="text-xs font-semibold text-muted-foreground truncate">
            {config.label}
          </span>
        </div>

        <div className="flex items-baseline gap-0.5 truncate flex-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {mainValue}
          </span>
          <span className="text-xs font-semibold text-muted-foreground truncate">
            {subValue}
          </span>
        </div>

        <div className="mt-auto">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                type === "calories" && "bg-health-orange",
                type === "steps" && "bg-emerald-500",
                type === "water" && "bg-health-blue"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
