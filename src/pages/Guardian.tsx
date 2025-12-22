import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Link2,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Clock,
  Heart,
  Flame,
  Droplets,
  CheckCircle,
  Dumbbell,
  Scale,
  RefreshCw,
} from "lucide-react";
import { useGuardianConnection } from "@/hooks/useGuardianConnection";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ConnectedUserSummary {
  userId: string;
  nickname: string;
  todayCalories: number;
  calorieGoal: number;
  todayWater: number;
  waterGoal: number;
  missionsCompleted: number;
  missionTotal: number;
  hasExercise: boolean;
  exerciseCount: number;
  latestWeight: number | null;
  goalWeight: number | null;
  lastUpdated: Date;
  // 영양 상세
  todayProtein: number;
  proteinGoal: number;
  todayCarbs: number;
  carbGoal: number;
  todayFat: number;
  fatGoal: number;
  // 건강검진
  latestHealthCheckup: {
    id: string;
    date: string;
    status: string;
    hasAIAnalysis: boolean;
    hasComment: boolean;
  } | null;
}

export default function Guardian() {
  const { user, profile } = useAuth();
  const {
    connections,
    pendingCode,
    codeExpiresAt,
    isLoading,
    generateConnectionCode,
    connectWithCode,
  } = useGuardianConnection();

  const [inputCode, setInputCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 보호자용: 연결된 사용자 데이터
  const [connectedUsersSummary, setConnectedUsersSummary] = useState<ConnectedUserSummary[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const isGuardian = profile?.user_type === "guardian";

  // 보호자일 경우 연결된 사용자 데이터 가져오기 (+ Supabase Realtime 실시간 동기화)
  useEffect(() => {
    if (!isGuardian || !user) return;

    const fetchConnectedUserData = async () => {
      setLoadingUserData(true);
      
      const activeConnections = connections.filter(
        (c) => c.guardian_id === user.id && c.user_id !== c.guardian_id
      );

      if (activeConnections.length === 0) {
        setConnectedUsersSummary([]);
        setLoadingUserData(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const summaries: ConnectedUserSummary[] = [];

      for (const conn of activeConnections) {
        const targetUserId = conn.user_id;

        // 프로필 조회
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', targetUserId)
          .single();

        // 오늘 칼로리 조회 (foods 포함)
        const { data: mealData } = await supabase
          .from('meal_records')
          .select('total_calories, foods')
          .eq('user_id', targetUserId)
          .eq('date', today);

        const todayCalories = (mealData || []).reduce((sum, r) => sum + (r.total_calories || 0), 0);

        // 영양 설정 조회
        const { data: nutritionSettings } = await supabase
          .from('nutrition_settings')
          .select('calorie_goal, protein_goal_g, carb_goal_g, fat_goal_g')
          .eq('user_id', targetUserId)
          .maybeSingle();

        const calorieGoal = nutritionSettings?.calorie_goal || 2000;

        // 오늘 물 섭취 조회
        const { data: waterData } = await supabase
          .from('water_logs')
          .select('amount')
          .eq('user_id', targetUserId)
          .eq('date', today);

        const todayWater = (waterData || []).reduce((sum, r) => sum + (r.amount || 0), 0);

        // 물 설정 조회
        const { data: waterSettings } = await supabase
          .from('water_settings')
          .select('daily_goal')
          .eq('user_id', targetUserId)
          .maybeSingle();

        const waterGoal = waterSettings?.daily_goal || 2000;

        // 오늘 미션 조회 (daily_logs에서 mission 타입)
        const { data: missionData } = await supabase
          .from('daily_logs')
          .select('is_completed')
          .eq('user_id', targetUserId)
          .eq('log_date', today)
          .eq('log_type', 'mission');

        const missionsCompleted = (missionData || []).filter(m => m.is_completed).length;
        const missionTotal = (missionData || []).length || 3;

        // 오늘 운동 기록 조회
        const { data: exerciseData } = await supabase
          .from('gym_records')
          .select('id, exercises')
          .eq('user_id', targetUserId)
          .eq('date', today);

        const hasExercise = (exerciseData || []).length > 0;
        const exerciseCount = (exerciseData || []).reduce((sum, r) => {
          const exercises = r.exercises as any[];
          return sum + (Array.isArray(exercises) ? exercises.length : 0);
        }, 0);

        // 최근 체중 조회
        const { data: weightData } = await supabase
          .from('weight_records')
          .select('weight')
          .eq('user_id', targetUserId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 목표 체중 조회
        const { data: goalData } = await supabase
          .from('weight_goals')
          .select('target_weight')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 영양 세부 정보 계산 (meal_records.foods에서 추출)
        let todayProtein = 0;
        let todayCarbs = 0;
        let todayFat = 0;
        (mealData || []).forEach((meal: any) => {
          const foods = meal.foods as any[];
          if (Array.isArray(foods)) {
            foods.forEach((food: any) => {
              todayProtein += food.protein || 0;
              todayCarbs += food.carbs || 0;
              todayFat += food.fat || 0;
            });
          }
        });

        const proteinGoal = nutritionSettings?.protein_goal_g || 60;
        const carbGoal = nutritionSettings?.carb_goal_g || 300;
        const fatGoal = nutritionSettings?.fat_goal_g || 65;

        // 최근 건강검진 조회
        const { data: healthRecord } = await supabase
          .from('health_records')
          .select('id, created_at, status, coach_comment')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let latestHealthCheckup = null;
        if (healthRecord) {
          // AI 분석 여부 확인
          const { data: aiReport } = await supabase
            .from('ai_health_reports')
            .select('id')
            .eq('source_record_id', healthRecord.id)
            .maybeSingle();

          latestHealthCheckup = {
            id: healthRecord.id,
            date: healthRecord.created_at,
            status: healthRecord.status || 'pending',
            hasAIAnalysis: !!aiReport,
            hasComment: !!healthRecord.coach_comment,
          };
        }

        summaries.push({
          userId: targetUserId,
          nickname: profileData?.nickname || '사용자',
          todayCalories,
          calorieGoal,
          todayWater,
          waterGoal,
          missionsCompleted,
          missionTotal,
          hasExercise,
          exerciseCount,
          latestWeight: weightData?.weight || null,
          goalWeight: goalData?.target_weight || null,
          lastUpdated: new Date(),
          todayProtein,
          proteinGoal,
          todayCarbs,
          carbGoal,
          todayFat,
          fatGoal,
          latestHealthCheckup,
        });
      }

      setConnectedUsersSummary(summaries);
      setLoadingUserData(false);
      setLastRefreshed(new Date());
    };

    fetchConnectedUserData();

    // 연결된 사용자 ID 목록
    const connectedUserIds = connections
      .filter((c) => c.guardian_id === user.id && c.user_id !== c.guardian_id)
      .map((c) => c.user_id);

    if (connectedUserIds.length === 0) return;

    // Supabase Realtime 구독: 물, 식사, 미션 테이블 변경 감지
    const channel = supabase
      .channel('guardian-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_logs',
        },
        (payload: any) => {
          if (connectedUserIds.includes(payload.new?.user_id || payload.old?.user_id)) {
            fetchConnectedUserData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_records',
        },
        (payload: any) => {
          if (connectedUserIds.includes(payload.new?.user_id || payload.old?.user_id)) {
            fetchConnectedUserData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_logs',
        },
        (payload: any) => {
          if (connectedUserIds.includes(payload.new?.user_id || payload.old?.user_id)) {
            fetchConnectedUserData();
          }
        }
      )
      .subscribe();

    // 포커스 시 데이터 리프레시
    const handleFocus = () => {
      fetchConnectedUserData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [isGuardian, user, connections]);

  const handleCopyCode = async () => {
    if (pendingCode) {
      await navigator.clipboard.writeText(pendingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    if (!inputCode.trim() || inputCode.length !== 6) return;

    setIsConnecting(true);
    await connectWithCode(inputCode);
    setInputCode("");
    setIsConnecting(false);
  };

  // Get active connections (excluding pending ones)
  const activeConnections = connections.filter(
    (c) => c.guardian_id && c.user_id !== c.guardian_id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">가족 연결</h1>
        <p className="text-lg text-muted-foreground">
          {isGuardian
            ? "부모님과 연결하여 건강을 함께 관리하세요"
            : "보호자와 연결하여 건강을 공유하세요"}
        </p>
      </div>

      {/* 연결 상태 */}
      {activeConnections.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6" />
            <span className="text-xl font-semibold">연결된 가족</span>
          </div>
          <div className="space-y-3">
            {activeConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between bg-white/10 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {isGuardian ? conn.user_nickname : conn.guardian_nickname || "가족"}
                    </p>
                    <p className="text-sm text-white/70">
                      {isGuardian ? "부모님" : "보호자"}
                    </p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-white/80" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 보호자용: 연결된 사용자 건강 요약 - 카드형 UI */}
      {isGuardian && activeConnections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              연결된 가족 현황
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(lastRefreshed, "HH:mm", { locale: ko })} 갱신
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  setLoadingUserData(true);
                  // Trigger refetch by re-running useEffect
                  window.dispatchEvent(new Event('focus'));
                }}
                disabled={loadingUserData}
              >
                <RefreshCw className={`w-4 h-4 ${loadingUserData ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loadingUserData ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : connectedUsersSummary.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-4">연결된 가족의 데이터가 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            connectedUsersSummary.map((summary) => {
              const caloriePercent = Math.min(100, Math.round((summary.todayCalories / summary.calorieGoal) * 100));
              const waterPercent = Math.min(100, Math.round((summary.todayWater / summary.waterGoal) * 100));
              const calorieStatus = caloriePercent < 50 ? '부족' : caloriePercent <= 100 ? '적정' : '초과';
              const waterStatus = waterPercent < 50 ? '부족' : waterPercent <= 100 ? '적정' : '초과';
              
              return (
                <Card key={summary.userId} className="rounded-2xl overflow-hidden">
                  {/* Card Header */}
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        {summary.nickname}님
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                        실시간
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2 space-y-3">
                    {/* 2열 그리드 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 칼로리 카드 */}
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium">섭취 칼로리</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {summary.todayCalories.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            / {summary.calorieGoal.toLocaleString()}
                          </span>
                        </p>
                        <Progress value={caloriePercent} className="h-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{caloriePercent}%</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              calorieStatus === '적정' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              calorieStatus === '부족' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {calorieStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* 물 카드 */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">물 섭취</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {summary.todayWater.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">ml</span>
                        </p>
                        <Progress value={waterPercent} className="h-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{waterPercent}%</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              waterStatus === '적정' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              waterStatus === '부족' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {waterStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* 운동 카드 */}
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium">오늘 운동</span>
                        </div>
                        {summary.hasExercise ? (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-lg font-semibold text-green-600 dark:text-green-400">완료</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {summary.exerciseCount}개 운동 기록
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-semibold text-muted-foreground">기록 없음</p>
                        )}
                      </div>

                      {/* 체중 카드 */}
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium">체중</span>
                        </div>
                        {summary.latestWeight ? (
                          <>
                            <p className="text-2xl font-bold text-foreground">
                              {summary.latestWeight}
                              <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
                            </p>
                            {summary.goalWeight && (
                              <p className="text-xs text-muted-foreground">
                                목표: {summary.goalWeight}kg
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-lg font-semibold text-muted-foreground">기록 없음</p>
                        )}
                      </div>
                    </div>

                    {/* 영양 요약 (탄단지) */}
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">영양 요약</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">탄수화물</p>
                          <p className="text-sm font-semibold">{Math.round(summary.todayCarbs)}g</p>
                          <p className="text-xs text-muted-foreground">/ {summary.carbGoal}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">단백질</p>
                          <p className="text-sm font-semibold">{Math.round(summary.todayProtein)}g</p>
                          <p className="text-xs text-muted-foreground">/ {summary.proteinGoal}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">지방</p>
                          <p className="text-sm font-semibold">{Math.round(summary.todayFat)}g</p>
                          <p className="text-xs text-muted-foreground">/ {summary.fatGoal}g</p>
                        </div>
                      </div>
                    </div>

                    {/* 건강검진 최신 상태 */}
                    {summary.latestHealthCheckup && (
                      <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-rose-500" />
                            <span className="text-sm font-medium">건강검진</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {summary.latestHealthCheckup.hasAIAnalysis && (
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                AI분석
                              </Badge>
                            )}
                            {summary.latestHealthCheckup.hasComment && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                코멘트
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm mt-2">
                          {format(new Date(summary.latestHealthCheckup.date), 'M월 d일', { locale: ko })} 업로드
                        </p>
                        <p className="text-xs text-muted-foreground">
                          상태: {summary.latestHealthCheckup.status === 'completed' ? '분석 완료' : 
                                summary.latestHealthCheckup.status === 'analyzing' ? '분석 중' : '대기 중'}
                        </p>
                      </div>
                    )}

                    {/* 미션 진행 */}
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">오늘 할 일</span>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={`${
                            summary.missionsCompleted === summary.missionTotal && summary.missionTotal > 0
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted'
                          }`}
                        >
                          {summary.missionsCompleted} / {summary.missionTotal} 완료
                        </Badge>
                      </div>
                      <Progress 
                        value={summary.missionTotal > 0 ? (summary.missionsCompleted / summary.missionTotal) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 사용자용: 연결 코드 생성 */}
      {!isGuardian && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">연결 코드 만들기</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            연결 코드를 만들어 보호자(자녀)에게 전달해주세요.
            <br />
            보호자가 코드를 입력하면 연결이 완료됩니다.
          </p>

          {pendingCode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 p-6 bg-muted rounded-2xl">
                <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                  {pendingCode}
                </span>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    코드 복사
                  </>
                )}
              </Button>
              {codeExpiresAt && (
                <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(codeExpiresAt, "M월 d일 HH:mm", { locale: ko })}까지 유효
                </p>
              )}
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full h-14"
              onClick={generateConnectionCode}
            >
              <Link2 className="w-5 h-5" />
              연결 코드 생성하기
            </Button>
          )}
        </div>
      )}

      {/* 보호자용: 코드 입력 */}
      {isGuardian && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">부모님과 연결하기</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            부모님이 만든 연결 코드를 입력해주세요.
          </p>

          <div className="space-y-4">
            <Input
              placeholder="6자리 코드 입력"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-16 text-2xl text-center font-mono tracking-widest"
              maxLength={6}
            />
            <Button
              size="lg"
              className="w-full h-14"
              onClick={handleConnect}
              disabled={inputCode.length !== 6 || isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  연결하기
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 연결 혜택 안내 */}
      <div className="bg-muted rounded-3xl p-6">
        <h3 className="font-semibold mb-4">연결하면 좋은 점</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">
              {isGuardian
                ? "부모님의 건강검진 결과를 함께 확인할 수 있어요"
                : "보호자가 건강 상태를 함께 확인할 수 있어요"}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">
              {isGuardian
                ? "부모님의 미션 수행 현황을 확인할 수 있어요"
                : "보호자에게 건강 리포트를 공유할 수 있어요"}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">
              {isGuardian
                ? "프리미엄 서비스를 대신 결제할 수 있어요"
                : "프리미엄 서비스를 보호자가 결제할 수 있어요"}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
