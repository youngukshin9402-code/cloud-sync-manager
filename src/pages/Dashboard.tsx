import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Flame,
  Droplets,
  Dumbbell,
  ChevronRight,
  Target,
  TrendingUp,
  Bell,
  CheckCircle,
  RefreshCw,
  Sparkles,
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
import { useToast } from "@/hooks/use-toast";

// 10가지 생활습관 Pool
const HABIT_POOL = [
  "물 6잔(1.2L) 마시기",
  "10분 이상 걷기",
  "아침 식사 기록하기",
  "계단으로 3층 이상 오르기",
  "30분 이상 걷기",
  "스트레칭 10분 하기",
  "과일/채소 2회 이상 섭취하기",
  "저녁 8시 이후 음식 안 먹기",
  "점심 식사 후 10분 산책하기",
  "잠자기 전 스마트폰 1시간 안 보기",
];

// 오늘 날짜 기반으로 3개 랜덤 선택
function selectRandomHabits(seed: string, count: number = 3): string[] {
  // Simple seeded random based on date string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const shuffled = [...HABIT_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = Math.abs((hash * 16807) % 2147483647);
    const j = hash % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterGoal, setWaterGoalState] = useState(2000);
  const [caloriesTotal, setCaloriesTotal] = useState(0);
  const [todayMissions, setTodayMissions] = useState<DailyMission | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiQuestion, setAIQuestion] = useState("");

  const today = getTodayString();

  const createNewMissions = useCallback((habits: string[]): DailyMission => {
    return {
      id: generateId(),
      date: today,
      missions: habits.map((content, idx) => ({
        id: `mission_${idx}_${Date.now()}`,
        content,
        completed: false,
      })),
      pointsAwarded: false,
    };
  }, [today]);

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
      // 오늘 날짜 기반 랜덤 3개 선택
      const todayHabits = selectRandomHabits(today);
      todayMission = createNewMissions(todayHabits);
      missions = [...missions, todayMission];
      setDailyMissions(missions);
    }
    
    setTodayMissions(todayMission);
  }, [today, createNewMissions]);

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
      
      toast({ title: "🎉 축하합니다!", description: "모든 할 일 완료로 100포인트 획득!" });
    }

    setTodayMissions(updatedTodayMission);

    // Save to localStorage
    const allMissions = getDailyMissions();
    const updated = allMissions.map(m => m.date === today ? updatedTodayMission : m);
    setDailyMissions(updated);
  };

  // 다른 제안 받기 - 3개를 다시 랜덤 추첨
  const handleReshuffle = () => {
    // 현재 완료 상태를 유지하지 않고 새로운 3개 추천
    const newSeed = `${today}_${Date.now()}`;
    const newHabits = selectRandomHabits(newSeed);
    const newMission = createNewMissions(newHabits);
    
    setTodayMissions(newMission);
    
    // Save to localStorage
    const allMissions = getDailyMissions();
    const updated = allMissions.map(m => m.date === today ? newMission : m);
    setDailyMissions(updated);
    
    toast({ title: "새로운 할 일을 추천했어요!", description: "오늘 지킬 3가지가 변경되었습니다." });
  };

  // AI에게 물어보기
  const handleAISubmit = () => {
    if (!aiQuestion.trim()) {
      toast({ title: "질문을 입력해주세요", variant: "destructive" });
      return;
    }
    
    // 간단한 응답 (실제 AI 연동 전 placeholder)
    toast({ 
      title: "AI 응답", 
      description: "아직 AI 기능이 연동되지 않았습니다. 추후 업데이트 예정입니다!" 
    });
    setAIQuestion("");
    setShowAIDialog(false);
  };

  if (!profile) return null;

  const completedMissions = todayMissions?.missions.filter(m => m.completed).length || 0;
  const totalMissions = todayMissions?.missions.length || 3;

  const calorieGoal = 2000;

  // Check for incomplete items
  const incompleteItems = [];
  if (waterTotal < waterGoal) incompleteItems.push("물 섭취");
  if (caloriesTotal === 0) incompleteItems.push("식사 기록");
  if (completedMissions < totalMissions) incompleteItems.push("오늘 할 일");

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
                <span className="text-sm text-muted-foreground">오늘 할 일</span>
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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleReshuffle}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            다른 제안 받기
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setShowAIDialog(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI에게 물어보기
          </Button>
        </div>

        {completedMissions === totalMissions && !todayMissions?.pointsAwarded && (
          <p className="text-center text-sm text-muted-foreground">
            모든 할 일을 완료하면 100포인트가 적립됩니다!
          </p>
        )}
      </div>

      {/* AI Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI에게 물어보기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              오늘의 할 일에 대해 궁금한 점이나 대안을 요청해보세요.
            </p>
            <Textarea
              placeholder="예: 걷기 대신 실내에서 할 수 있는 운동을 추천해줘"
              value={aiQuestion}
              onChange={(e) => setAIQuestion(e.target.value)}
              rows={3}
            />
            <Button className="w-full" onClick={handleAISubmit}>
              질문하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
