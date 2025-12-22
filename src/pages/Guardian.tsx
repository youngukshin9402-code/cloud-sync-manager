import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronRight,
  ChevronDown,
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const isGuardian = profile?.user_type === "guardian";

  // 보호자일 경우 연결된 사용자 데이터 가져오기 (+ 실시간 갱신)
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

        // 오늘 칼로리 조회
        const { data: mealData } = await supabase
          .from('meal_records')
          .select('total_calories')
          .eq('user_id', targetUserId)
          .eq('date', today);

        const todayCalories = (mealData || []).reduce((sum, r) => sum + (r.total_calories || 0), 0);

        // 영양 설정 조회
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

        // 오늘 미션 조회 (daily_logs에서 mission 타입)
        const { data: missionData } = await supabase
          .from('daily_logs')
          .select('is_completed')
          .eq('user_id', targetUserId)
          .eq('log_date', today)
          .eq('log_type', 'mission');

        const missionsCompleted = (missionData || []).filter(m => m.is_completed).length;
        const missionTotal = (missionData || []).length || 3;

        summaries.push({
          userId: targetUserId,
          nickname: profileData?.nickname || '사용자',
          todayCalories,
          calorieGoal,
          todayWater,
          waterGoal,
          missionsCompleted,
          missionTotal,
        });
      }

      setConnectedUsersSummary(summaries);
      setLoadingUserData(false);
    };

    fetchConnectedUserData();

    // 포커스 시 데이터 리프레시
    const handleFocus = () => {
      fetchConnectedUserData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
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

      {/* 보호자용: 연결된 사용자 건강 요약 */}
      {isGuardian && activeConnections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            부모님 오늘 건강 현황
          </h2>

          {loadingUserData ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : connectedUsersSummary.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                연결된 가족의 데이터를 불러올 수 없습니다.
              </CardContent>
            </Card>
          ) : (
            connectedUsersSummary.map((summary) => (
              <Card key={summary.userId} className="overflow-hidden">
                <CardHeader 
                  className="pb-3 cursor-pointer"
                  onClick={() => setExpandedUserId(
                    expandedUserId === summary.userId ? null : summary.userId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      {summary.nickname}님
                    </CardTitle>
                    {expandedUserId === summary.userId ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                
                {expandedUserId === summary.userId && (
                  <CardContent className="pt-0 space-y-4">
                    {/* 칼로리 */}
                    <div className="flex items-center justify-between p-3 bg-health-orange/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-health-orange/20 flex items-center justify-center">
                          <Flame className="w-5 h-5 text-health-orange" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">섭취 칼로리</p>
                          <p className="font-semibold">
                            {summary.todayCalories.toLocaleString()} / {summary.calorieGoal.toLocaleString()} kcal
                          </p>
                        </div>
                      </div>
                      {summary.todayCalories >= summary.calorieGoal && (
                        <Badge className="bg-health-green text-white">달성</Badge>
                      )}
                    </div>

                    {/* 물 섭취 */}
                    <div className="flex items-center justify-between p-3 bg-health-blue/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-health-blue/20 flex items-center justify-center">
                          <Droplets className="w-5 h-5 text-health-blue" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">물 섭취</p>
                          <p className="font-semibold">
                            {summary.todayWater.toLocaleString()} / {summary.waterGoal.toLocaleString()} ml
                          </p>
                        </div>
                      </div>
                      {summary.todayWater >= summary.waterGoal && (
                        <Badge className="bg-health-green text-white">달성</Badge>
                      )}
                    </div>

                    {/* 미션 */}
                    <div className="flex items-center justify-between p-3 bg-health-green/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-health-green/20 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-health-green" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">오늘 할 일</p>
                          <p className="font-semibold">
                            {summary.missionsCompleted} / {summary.missionTotal} 완료
                          </p>
                        </div>
                      </div>
                      {summary.missionsCompleted === summary.missionTotal && summary.missionTotal > 0 && (
                        <Badge className="bg-health-green text-white">달성</Badge>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
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
