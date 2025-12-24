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
    label: "칼로리",
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
  let mainValue = "";
  let subValue = "";
  let progress = 0;

  if (type === "inbody") {
    isAchieved = hasInbodyData === true;
    mainValue = hasInbodyData && actualAge && healthAge 
      ? `${actualAge} / ${healthAge}세` 
      : "- / -";
    subValue = "현재/신체나이";
    progress = hasInbodyData ? 100 : 0;
  } else if (type === "calories") {
    isAchieved = calorieGoal > 0 && currentCalories >= calorieGoal;
    mainValue = caloriesLoading ? "…" : `${currentCalories.toLocaleString()}`;
    subValue = `/${calorieGoal.toLocaleString()}kcal`;
    progress = calorieGoal > 0 ? Math.min((currentCalories / calorieGoal) * 100, 100) : 0;
  } else if (type === "steps") {
    isAchieved = currentSteps >= stepsGoal;
    mainValue = currentSteps.toLocaleString();
    subValue = `/${stepsGoal.toLocaleString()}`;
    progress = stepsGoal > 0 ? Math.min((currentSteps / stepsGoal) * 100, 100) : 0;
  } else if (type === "water") {
    isAchieved = currentWater >= waterGoal;
    mainValue = `${currentWater}`;
    subValue = `/${waterGoal}ml`;
    progress = waterGoal > 0 ? Math.min((currentWater / waterGoal) * 100, 100) : 0;
  }

  const CardContent = (
    <div className="bg-card rounded-xl border border-border p-2.5 hover:shadow-md transition-shadow h-full flex flex-col relative">
      {/* 달성 뱃지 - 우상단 고정 */}
      {isAchieved && (
        <Badge className="absolute top-1.5 right-1.5 bg-health-green text-white text-[10px] px-1.5 py-0 h-4">
          달성
        </Badge>
      )}
      
      {/* 아이콘 + 라벨 */}
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
          <Icon className={cn("w-3.5 h-3.5", config.color)} />
        </div>
        <span className="text-xs font-medium text-muted-foreground truncate">
          {config.label}
        </span>
      </div>

      {/* 메인 값 + 단위 - 한 줄 */}
      <div className="flex items-baseline gap-0.5 truncate">
        <span className={cn(
          "font-bold tabular-nums text-foreground",
          type === "inbody" ? "text-lg" : "text-2xl"
        )}>
          {mainValue}
        </span>
        <span className="text-xs font-medium text-muted-foreground truncate">
          {subValue}
        </span>
      </div>

      {/* 프로그레스 바 */}
      {type !== "inbody" && (
        <div className="mt-auto pt-1.5">
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
      )}
    </div>
  );

  return (
    <Link to={config.link} className="block">
      {CardContent}
    </Link>
  );
}
