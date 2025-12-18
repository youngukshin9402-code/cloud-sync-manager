import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Flame,
  Droplets,
  Dumbbell,
  ChevronRight,
  Target,
  TrendingUp,
  Utensils,
  Heart,
  ShoppingBag,
  Bell,
  CheckCircle,
  Stethoscope,
} from "lucide-react";
import {
  getWaterLogs,
  getWaterSettings,
  getMealRecords,
  getDailyMissions,
  setDailyMissions,
  getPoints,
  setPoints,
  getPointHistory,
  setPointHistory,
  generateId,
  getTodayString,
  DailyMission,
} from "@/lib/localStorage";
import { cn } from "@/lib/utils";

// Default missions
const defaultMissions = [
  "물 6잔(1.2L) 마시기",
  "10분 이상 걷기",
  "아침 식사 기록하기",
];

export default function Dashboard() {
  const { profile } = useAuth();
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterGoal, setWaterGoalState] = useState(2000);
  const [caloriesTotal, setCaloriesTotal] = useState(0);
  const [todayMissions, setTodayMissions] = useState<DailyMission | null>(null);

  const today = getTodayString();

  useEffect(() => {
    // Load water data
    const waterLogs = getWaterLogs();
    const todayWater = waterLogs
      .filter(log => log.date === today)
      .reduce((sum, log) => sum + log.amount, 0);
    setWaterTotal(todayWater);
    setWaterGoalState(getWaterSettings().dailyGoal);

    // Load meal data
    const meals = getMealRecords();
    const todayMeals = meals.filter(m => m.date === today);
    const totalCal = todayMeals.reduce((sum, m) => sum + m.totalCalories, 0);
    setCaloriesTotal(totalCal);

    // Load or create daily missions
    let missions = getDailyMissions();
    let todayMission = missions.find(m => m.date === today);
    
    if (!todayMission) {
      todayMission = {
        id: generateId(),
        date: today,
        missions: defaultMissions.map((content, idx) => ({
          id: `mission_${idx}`,
          content,
          completed: false,
        })),
        pointsAwarded: false,
      };
      missions = [...missions, todayMission];
      setDailyMissions(missions);
    }
    
    setTodayMissions(todayMission);
  }, [today]);

  const handleMissionToggle = (missionId: string) => {
    if (!todayMissions) return;

    const updatedMissions = todayMissions.missions.map(m =>
      m.id === missionId ? { ...m, completed: !m.completed } : m
    );

    const allCompleted = updatedMissions.every(m => m.completed);
    let updatedTodayMission = { ...todayMissions, missions: updatedMissions };

    // Award points if all completed and not already awarded
    if (allCompleted && !todayMissions.pointsAwarded) {
      updatedTodayMission.pointsAwarded = true;
      
      // Update points
      const currentPoints = getPoints();
      setPoints(currentPoints + 100);
      
      // Add to history
      const history = getPointHistory();
      setPointHistory([...history, {
        id: generateId(),
        date: today,
        amount: 100,
        reason: "일일 미션 완료",
        type: 'earn',
      }]);
    }

    setTodayMissions(updatedTodayMission);

    // Save to localStorage
    const allMissions = getDailyMissions();
    const updated = allMissions.map(m => m.date === today ? updatedTodayMission : m);
    setDailyMissions(updated);
  };

  if (!profile) return null;

  const completedMissions = todayMissions?.missions.filter(m => m.completed).length || 0;
  const totalMissions = todayMissions?.missions.length || 3;

  const calorieGoal = 2000;

  // Check for incomplete items
  const incompleteItems = [];
  if (waterTotal < waterGoal) incompleteItems.push("물 섭취");
  if (caloriesTotal === 0) incompleteItems.push("식사 기록");
  if (completedMissions < totalMissions) incompleteItems.push("운동 미션");

  const isGuardian = profile?.user_type === "guardian";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            안녕하세요, {profile?.nickname || "회원"}님!
          </h1>
          <p className="text-muted-foreground">오늘도 건강한 하루 보내세요 🌟</p>
        </div>
      </div>

      {/* Today's Summary KPIs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          오늘 요약
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Calories */}
          <Link to="/nutrition" className="block">
            <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-health-orange/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-health-orange" />
                </div>
                <span className="text-sm text-muted-foreground">섭취 칼로리</span>
              </div>
              <p className="text-xl font-bold">{caloriesTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">목표 {calorieGoal.toLocaleString()} kcal</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-orange transition-all"
                  style={{ width: `${Math.min((caloriesTotal / calorieGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Water */}
          <Link to="/water" className="block">
            <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-health-blue/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-health-blue" />
                </div>
                <span className="text-sm text-muted-foreground">물 섭취</span>
              </div>
              <p className="text-xl font-bold">{waterTotal.toLocaleString()}ml</p>
              <p className="text-xs text-muted-foreground">목표 {waterGoal.toLocaleString()}ml</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-blue transition-all"
                  style={{ width: `${Math.min((waterTotal / waterGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Exercise */}
          <Link to="/exercise" className="block">
            <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-health-green/10 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-health-green" />
                </div>
                <span className="text-sm text-muted-foreground">운동 미션</span>
              </div>
              <p className="text-xl font-bold">{completedMissions}/{totalMissions}</p>
              <p className="text-xs text-muted-foreground">완료</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-green transition-all"
                  style={{ width: `${(completedMissions / totalMissions) * 100}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Incomplete Alert */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-yellow-600" />
              </div>
              <span className="text-sm text-muted-foreground">미완료</span>
            </div>
            {incompleteItems.length > 0 ? (
              <>
                <p className="text-xl font-bold text-yellow-600">{incompleteItems.length}개</p>
                <p className="text-xs text-muted-foreground truncate">{incompleteItems.join(', ')}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-health-green">완료!</p>
                <p className="text-xs text-muted-foreground">오늘 할 일 완료 🎉</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Today's Missions Checklist */}
      <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            오늘 할 일
          </h2>
          {todayMissions?.pointsAwarded && (
            <span className="px-3 py-1 bg-health-green/10 text-health-green rounded-full text-sm font-medium">
              +100P 적립완료
            </span>
          )}
        </div>

        <div className="space-y-3">
          {todayMissions?.missions.map(mission => (
            <div
              key={mission.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                mission.completed ? 'bg-health-green/5' : 'bg-muted/50'
              )}
            >
              <Checkbox
                checked={mission.completed}
                onCheckedChange={() => handleMissionToggle(mission.id)}
                className="w-6 h-6"
              />
              <span className={cn("flex-1", mission.completed && 'line-through text-muted-foreground')}>
                {mission.content}
              </span>
            </div>
          ))}
        </div>

        {completedMissions === totalMissions && !todayMissions?.pointsAwarded && (
          <p className="text-center text-sm text-muted-foreground">
            모든 미션을 완료하면 100포인트가 적립됩니다!
          </p>
        )}
      </div>

      {/* Quick Access Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">바로가기</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/medical" className="block">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 border border-red-200 hover:shadow-md transition-shadow">
              <Stethoscope className="w-8 h-8 text-red-500 mb-2" />
              <p className="font-semibold text-red-900">의료양갱</p>
              <p className="text-sm text-red-700">건강검진 분석</p>
            </div>
          </Link>
          <Link to="/nutrition" className="block">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200 hover:shadow-md transition-shadow">
              <Utensils className="w-8 h-8 text-orange-500 mb-2" />
              <p className="font-semibold text-orange-900">식단양갱</p>
              <p className="text-sm text-orange-700">식사 기록</p>
            </div>
          </Link>
          <Link to="/exercise" className="block">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200 hover:shadow-md transition-shadow">
              <Dumbbell className="w-8 h-8 text-green-500 mb-2" />
              <p className="font-semibold text-green-900">운동양갱</p>
              <p className="text-sm text-green-700">운동 기록</p>
            </div>
          </Link>
          <Link to="/shop" className="block">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200 hover:shadow-md transition-shadow">
              <ShoppingBag className="w-8 h-8 text-purple-500 mb-2" />
              <p className="font-semibold text-purple-900">건강상점</p>
              <p className="text-sm text-purple-700">1:1 코칭</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Guardian Family Section */}
      {isGuardian && (
        <Link to="/mypage/guardian" className="block">
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">연결된 가족 현황</p>
                <p className="text-sm text-muted-foreground">건강 요약 보기</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Premium Upsell */}
      {profile?.subscription_tier !== "premium" && (
        <Link to="/premium" className="block">
          <div className="bg-gradient-to-r from-primary to-yanggaeng-amber rounded-2xl p-5 text-primary-foreground">
            <p className="font-bold text-lg">프리미엄으로 업그레이드</p>
            <p className="text-sm opacity-90">전문가 1:1 코칭을 받아보세요</p>
            <Button variant="secondary" size="sm" className="mt-3">
              자세히 보기
            </Button>
          </div>
        </Link>
      )}
    </div>
  );
}
