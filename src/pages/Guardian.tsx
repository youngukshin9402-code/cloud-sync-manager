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
  RefreshCw,
} from "lucide-react";
import { useGuardianConnection } from "@/hooks/useGuardianConnection";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 보호자 열람 범위: 오늘 요약 카드 4개만 (칼로리, 물, 운동, 건강나이)
interface ConnectedUserTodaySummary {
  userId: string;
  nickname: string;
  todayCalories: number;
  calorieGoal: number;
  todayWater: number;
  waterGoal: number;
  healthAge: number | null;
  hasExercise: boolean;
  exerciseCount: number;
  lastUpdated: Date;
}

export default function Guardian() {
  const { user, profile } = useAuth();
  const {
    connections,
    isLoading,
    pendingVerificationCode,
    verificationExpiresAt,
    generatePhoneVerificationCode,
    connectWithPhoneVerification,
  } = useGuardianConnection();
  
  const [myPhone, setMyPhone] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 보호자용: 연결된 사용자 오늘 요약 데이터 (제한된 범위)
  const [connectedUsersSummary, setConnectedUsersSummary] = useState<ConnectedUserTodaySummary[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const isGuardian = profile?.user_type === "guardian";

  // 보호자일 경우 연결된 사용자 "오늘" 데이터만 가져오기 (KST 기준)
  useEffect(() => {
    if (!isGuardian || !user) return;

    const fetchConnectedUserTodayData = async () => {
      setLoadingUserData(true);
      
      const activeConnections = connections.filter(
        (c) => c.guardian_id === user.id && c.user_id !== c.guardian_id
      );

      if (activeConnections.length === 0) {
        setConnectedUsersSummary([]);
        setLoadingUserData(false);
        return;
      }

      // KST 기준 오늘 날짜
      const now = new Date();
      const kstOffset = 9 * 60;
      const utcOffset = now.getTimezoneOffset();
      const kstDate = new Date(now.getTime() + (kstOffset + utcOffset) * 60 * 1000);
      const today = kstDate.toISOString().split('T')[0];
      
      const summaries: ConnectedUserTodaySummary[] = [];

      for (const conn of activeConnections) {
        const targetUserId = conn.user_id;

        // 프로필 조회
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', targetUserId)
          .single();

        // 오늘 칼로리 조회 (오늘 데이터만)
        const { data: mealData } = await supabase
          .from('meal_records')
          .select('total_calories')
          .eq('user_id', targetUserId)
          .eq('date', today);

        const todayCalories = (mealData || []).reduce((sum, r) => sum + (r.total_calories || 0), 0);

        // 영양 설정 조회 (목표값만)
        const { data: nutritionSettings } = await supabase
          .from('nutrition_settings')
          .select('calorie_goal')
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

        // 건강나이 조회 (가장 최근 건강기록에서)
        const { data: healthData } = await supabase
          .from('health_records')
          .select('health_age')
          .eq('user_id', targetUserId)
          .not('health_age', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const healthAge = healthData?.health_age || null;

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

        summaries.push({
          userId: targetUserId,
          nickname: profileData?.nickname || '사용자',
          todayCalories,
          calorieGoal,
          todayWater,
          waterGoal,
          healthAge,
          hasExercise,
          exerciseCount,
          lastUpdated: new Date(),
        });
      }

      setConnectedUsersSummary(summaries);
      setLoadingUserData(false);
      setLastRefreshed(new Date());
    };

    fetchConnectedUserTodayData();

    // 연결된 사용자 ID 목록
    const connectedUserIds = connections
      .filter((c) => c.guardian_id === user.id && c.user_id !== c.guardian_id)
      .map((c) => c.user_id);

    if (connectedUserIds.length === 0) return;

    // Supabase Realtime 구독
    const channel = supabase
      .channel('guardian-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs' },
        (payload: any) => {
          if (connectedUserIds.includes(payload.new?.user_id || payload.old?.user_id)) {
            fetchConnectedUserTodayData();
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_records' },
        (payload: any) => {
          if (connectedUserIds.includes(payload.new?.user_id || payload.old?.user_id)) {
            fetchConnectedUserTodayData();
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' },
        (payload: any) => {
          if (connectedUserIds.includes(payload.new?.user_id || payload.old?.user_id)) {
            fetchConnectedUserTodayData();
          }
        }
      )
      .subscribe();

    const handleFocus = () => fetchConnectedUserTodayData();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [isGuardian, user, connections]);

  const handleCopyCode = async () => {
    if (pendingVerificationCode) {
      await navigator.clipboard.writeText(pendingVerificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateCode = async () => {
    if (!myPhone || myPhone.length < 10) return;
    await generatePhoneVerificationCode(myPhone);
  };

  const handleConnect = async () => {
    if (!inputCode.trim() || inputCode.length !== 6 || !targetPhone || targetPhone.length < 10) return;
    setIsConnecting(true);
    await connectWithPhoneVerification(targetPhone, inputCode);
    setInputCode("");
    setTargetPhone("");
    setIsConnecting(false);
  };

  const formatPhoneNumber = (value: string) => value.replace(/\D/g, "").slice(0, 11);

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
            ? "부모님의 오늘 건강 현황을 확인하세요"
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

      {/* 보호자용: 오늘 요약 카드 4개만 표시 */}
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
                onClick={() => window.dispatchEvent(new Event('focus'))}
                disabled={loadingUserData}
              >
                <RefreshCw className={`w-4 h-4 ${loadingUserData ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loadingUserData ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : connectedUsersSummary.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">연결된 가족의 데이터가 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            connectedUsersSummary.map((summary) => {
              const caloriePercent = Math.min(100, Math.round((summary.todayCalories / summary.calorieGoal) * 100));
              const waterPercent = Math.min(100, Math.round((summary.todayWater / summary.waterGoal) * 100));
              
              return (
                <Card key={summary.userId} className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        {summary.nickname}님의 오늘
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                        실시간
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    {/* 오늘 요약 카드 4개 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 칼로리 카드 */}
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium">오늘 칼로리</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {summary.todayCalories.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">kcal</span>
                        </p>
                        <Progress value={caloriePercent} className="h-2" />
                        <span className="text-xs text-muted-foreground">목표 대비 {caloriePercent}%</span>
                      </div>

                      {/* 물 카드 */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">오늘 물</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {summary.todayWater.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">ml</span>
                        </p>
                        <Progress value={waterPercent} className="h-2" />
                        <span className="text-xs text-muted-foreground">목표 대비 {waterPercent}%</span>
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

                      {/* 건강나이 카드 */}
                      <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-rose-500" />
                          <span className="text-sm font-medium">건강나이</span>
                        </div>
                        {summary.healthAge !== null ? (
                          <p className="text-2xl font-bold text-foreground">
                            {summary.healthAge}
                            <span className="text-sm font-normal text-muted-foreground ml-1">세</span>
                          </p>
                        ) : (
                          <p className="text-lg font-semibold text-muted-foreground">기록 없음</p>
                        )}
                      </div>
                    </div>

                    {/* 안내 문구 */}
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      오늘의 요약 정보만 확인할 수 있습니다
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 사용자용: 휴대전화 인증 코드 생성 */}
      {!isGuardian && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">보호자 연결하기</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            휴대전화 인증으로 안전하게 보호자와 연결하세요.
            <br />
            인증 코드와 휴대전화 번호를 보호자에게 전달해주세요.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">내 휴대전화 번호</label>
              <Input
                type="tel"
                placeholder="01012345678"
                value={myPhone}
                onChange={(e) => setMyPhone(formatPhoneNumber(e.target.value))}
                maxLength={11}
                className="h-14 text-lg"
              />
            </div>
            
            {pendingVerificationCode ? (
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-2xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">인증 코드</p>
                  <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                    {pendingVerificationCode}
                  </span>
                  {verificationExpiresAt && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(verificationExpiresAt, "HH:mm", { locale: ko })}까지 유효
                    </p>
                  )}
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>보호자에게 전달하세요:</strong><br />
                    1. 내 휴대전화 번호: {myPhone}<br />
                    2. 인증 코드: {pendingVerificationCode}
                  </p>
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
                      인증 코드 복사
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full h-14"
                onClick={handleGenerateCode}
                disabled={!myPhone || myPhone.length < 10}
              >
                <Link2 className="w-5 h-5" />
                인증 코드 생성하기
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              인증 코드는 5분간 유효합니다
            </p>
          </div>
        </div>
      )}

      {/* 보호자용: 휴대전화 번호 + 인증 코드 입력 */}
      {isGuardian && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">가족과 연결하기</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            가족에게 받은 휴대전화 번호와 인증 코드를 입력해주세요.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">가족 휴대전화 번호</label>
              <Input
                type="tel"
                placeholder="01012345678"
                value={targetPhone}
                onChange={(e) => setTargetPhone(formatPhoneNumber(e.target.value))}
                maxLength={11}
                className="h-14 text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">인증 코드 (6자리)</label>
              <Input
                placeholder="인증 코드 6자리"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-16 text-2xl text-center font-mono tracking-widest"
                maxLength={6}
              />
            </div>
            <Button
              size="lg"
              className="w-full h-14"
              onClick={handleConnect}
              disabled={inputCode.length !== 6 || !targetPhone || targetPhone.length < 10 || isConnecting}
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
    </div>
  );
}
