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
    label: "섭취 칼로리",
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
    label: "물 섭취",
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
      ? `${actualAge}세 / ${healthAge}세` 
      : "- / -";
    subValue = "현재 나이 / 신체 나이";
    progress = hasInbodyData ? 100 : 0;
  } else if (type === "calories") {
    isAchieved = calorieGoal > 0 && currentCalories >= calorieGoal;
    mainValue = caloriesLoading ? "…" : `${currentCalories.toLocaleString()}`;
    subValue = `목표 ${calorieGoal.toLocaleString()} kcal`;
    progress = calorieGoal > 0 ? Math.min((currentCalories / calorieGoal) * 100, 100) : 0;
  } else if (type === "steps") {
    isAchieved = currentSteps >= stepsGoal;
    mainValue = currentSteps.toLocaleString();
    subValue = `목표 ${stepsGoal.toLocaleString()} 걸음`;
    progress = stepsGoal > 0 ? Math.min((currentSteps / stepsGoal) * 100, 100) : 0;
  } else if (type === "water") {
    isAchieved = currentWater >= waterGoal;
    mainValue = `${currentWater.toLocaleString()}ml`;
    subValue = `목표 ${waterGoal.toLocaleString()}ml`;
    progress = waterGoal > 0 ? Math.min((currentWater / waterGoal) * 100, 100) : 0;
  }

  const CardContent = (
    <div className="bg-card rounded-2xl border border-border p-3 hover:shadow-md transition-shadow h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
            <Icon className={cn("w-4 h-4", config.color)} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
            {config.label}
          </span>
        </div>
        {isAchieved && (
          <Badge className="bg-health-green text-white text-[10px] px-1.5 py-0.5 shrink-0">
            달성
          </Badge>
        )}
      </div>

      {/* 메인 값 */}
      <p className={cn(
        "font-bold tabular-nums",
        type === "inbody" ? "text-base" : "text-xl"
      )}>
        {mainValue}
      </p>

      {/* 서브 텍스트 */}
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {subValue}
      </p>

      {/* 프로그레스 바 */}
      {type !== "inbody" && (
        <div className="mt-auto pt-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
    <Link to={config.link} className="block h-full">
      {CardContent}
    </Link>
  );
}
