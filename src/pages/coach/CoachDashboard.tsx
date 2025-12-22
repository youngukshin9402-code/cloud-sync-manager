import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCoachData } from "@/hooks/useCoachData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoachFeedbackForm } from "@/components/CoachFeedbackForm";
import { WeeklyMetricsCard } from "@/components/coach/WeeklyMetricsCard";
import {
  Users,
  Search,
  Video,
  FileText,
  AlertCircle,
  Clock,
  MessageSquare,
  BarChart3,
  ClipboardCheck,
  Flame,
  Droplets,
  Dumbbell,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface CheckinReport {
  id: string;
  user_id: string;
  report_date: string;
  created_at: string;
  summary: {
    kcal?: { intake: number; goal: number; percent: number };
    macros?: { carbs: number; protein: number; fat: number };
    water?: { intake_ml: number; goal_ml: number };
    workout?: Array<{ name: string; sets?: number; reps?: number; weight?: number }>;
    weight?: { current: number; goal: number };
    conditions?: string[];
    memo?: string;
  };
  user_nickname?: string;
}

export default function CoachDashboard() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { assignedUsers, pendingReviews, todaySessions, loading } = useCoachData();
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackUserId, setFeedbackUserId] = useState<string | null>(null);
  const [feedbackUserNickname, setFeedbackUserNickname] = useState<string>("");
  const [checkinReports, setCheckinReports] = useState<CheckinReport[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);

  // 체크인 리포트 가져오기
  useEffect(() => {
    if (!user) return;

    const fetchCheckinReports = async () => {
      setLoadingCheckins(true);
      
      // 최근 7일간 체크인 리포트 조회
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await (supabase
        .from('checkin_reports')
        .select('*')
        .gte('report_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(20) as any);

      if (!error && data) {
        // 사용자 닉네임 매핑
        const userIds = [...new Set(data.map((r: any) => r.user_id))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const nicknameMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);
        
        const reportsWithNicknames = data.map((r: any) => ({
          ...r,
          user_nickname: nicknameMap.get(r.user_id) || '사용자',
        }));

        setCheckinReports(reportsWithNicknames);
      }
      
      setLoadingCheckins(false);
    };

    fetchCheckinReports();
  }, [user]);

  const filteredUsers = assignedUsers.filter((user) =>
    user.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-emerald-600 bg-emerald-100";
      case "caution":
        return "text-amber-600 bg-amber-100";
      case "warning":
        return "text-red-600 bg-red-100";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "good":
        return "양호";
      case "caution":
        return "주의";
      case "warning":
        return "관리";
      default:
        return "-";
    }
  };

  const openFeedbackForm = (userId: string, nickname: string) => {
    setFeedbackUserId(userId);
    setFeedbackUserNickname(nickname || "사용자");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">코치 대시보드</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.nickname}님, 환영합니다
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/coach/chat')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              채팅
            </Button>
            <Button variant="ghost" onClick={signOut}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">담당 회원</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {assignedUsers.length}명
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span className="text-muted-foreground">검토 대기</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {pendingReviews.length}건
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-sky-600" />
              <span className="text-muted-foreground">오늘 코칭</span>
            </div>
            <p className="text-3xl font-bold text-sky-600">{todaySessions.length}건</p>
          </div>
        </div>

        {/* 검토 대기 알림 */}
        {pendingReviews.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                검토가 필요한 건강검진 결과가 {pendingReviews.length}건 있어요
              </p>
              <p className="text-sm text-amber-600">
                회원들이 결과를 기다리고 있어요.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const first = pendingReviews[0];
                if (first) navigate(`/coach/user/${first.user_id}`);
              }}
            >
              검토하기
            </Button>
          </div>
        )}

        {/* 배정 사용자 7일 지표 */}
        {assignedUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">최근 7일 지표</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedUsers.slice(0, 6).map((user) => (
                <WeeklyMetricsCard
                  key={user.id}
                  userId={user.id}
                  nickname={user.nickname || "사용자"}
                />
              ))}
            </div>
          </div>
        )}

        {/* 체크인 리포트 카드 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">최근 체크인 리포트</h2>
          </div>

          {loadingCheckins ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : checkinReports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>아직 체크인 리포트가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkinReports.map((report) => (
                <Card key={report.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-medium text-sm">
                            {report.user_nickname?.[0] || "?"}
                          </span>
                        </div>
                        {report.user_nickname}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {format(new Date(report.report_date), "M/d (E)", { locale: ko })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 칼로리 */}
                    {report.summary?.kcal && (
                      <div className="flex items-center gap-2 text-sm">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-muted-foreground">칼로리:</span>
                        <span className="font-medium">
                          {report.summary.kcal.intake?.toLocaleString() || 0} / {report.summary.kcal.goal?.toLocaleString() || 0} kcal
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "ml-auto text-xs",
                            (report.summary.kcal.percent || 0) >= 80 
                              ? "border-emerald-500 text-emerald-600" 
                              : "border-amber-500 text-amber-600"
                          )}
                        >
                          {report.summary.kcal.percent || 0}%
                        </Badge>
                      </div>
                    )}

                    {/* 탄단지 */}
                    {report.summary?.macros && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">탄/단/지:</span>
                        <span className="font-medium">
                          {report.summary.macros.carbs || 0}g / {report.summary.macros.protein || 0}g / {report.summary.macros.fat || 0}g
                        </span>
                      </div>
                    )}

                    {/* 물 */}
                    {report.summary?.water && (
                      <div className="flex items-center gap-2 text-sm">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-muted-foreground">물:</span>
                        <span className="font-medium">
                          {report.summary.water.intake_ml?.toLocaleString() || 0} / {report.summary.water.goal_ml?.toLocaleString() || 0} ml
                        </span>
                      </div>
                    )}

                    {/* 운동 */}
                    {report.summary?.workout && report.summary.workout.length > 0 ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Dumbbell className="w-4 h-4 text-purple-500" />
                        <span className="text-muted-foreground">운동:</span>
                        <span className="font-medium">
                          {report.summary.workout.map(w => w.name).join(", ")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Dumbbell className="w-4 h-4" />
                        <span>운동 기록 없음</span>
                      </div>
                    )}

                    {/* 체중 */}
                    {report.summary?.weight && (
                      <div className="flex items-center gap-2 text-sm">
                        <Scale className="w-4 h-4 text-teal-500" />
                        <span className="text-muted-foreground">체중:</span>
                        <span className="font-medium">
                          {report.summary.weight.current || "-"}kg (목표 {report.summary.weight.goal || "-"}kg)
                        </span>
                      </div>
                    )}

                    {/* 메모 */}
                    {report.summary?.memo && (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-2">
                        📝 {report.summary.memo}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 피드백 작성 폼 */}
        {feedbackUserId && (
          <CoachFeedbackForm
            userId={feedbackUserId}
            userNickname={feedbackUserNickname}
            onSuccess={() => setFeedbackUserId(null)}
            onCancel={() => setFeedbackUserId(null)}
          />
        )}

        {/* 회원 리스트 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">담당 회원</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="회원 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "담당 회원이 없습니다"}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      회원
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      건강상태
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      미션달성
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      최근활동
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {user.nickname?.[0] || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.nickname || "이름없음"}</p>
                            {user.pendingReview && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                검토 대기
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium",
                            getStatusColor(user.healthStatus)
                          )}
                        >
                          {getStatusText(user.healthStatus)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium">{user.missionRate}%</span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {user.lastActive}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/coach/user/${user.id}`)}
                          >
                            상세
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openFeedbackForm(user.id, user.nickname || "")}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/video-call/new?userId=${user.id}`)}
                          >
                            <Video className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
