import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp,
  Crown,
  Activity,
  Utensils,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  totalHealthRecords: number;
  totalMealRecords: number;
  totalGymRecords: number;
  activeUsersToday: number;
  weeklySignups: number[];
}

export default function AdminStats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalHealthRecords: 0,
    totalMealRecords: 0,
    totalGymRecords: 0,
    activeUsersToday: 0,
    weeklySignups: [],
  });

  const fetchStats = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // 전체 사용자
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("user_type", ["user", "guardian"]);

    // 프리미엄 사용자
    const { count: premiumUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_tier", "premium");

    // 건강검진 기록
    const { count: totalHealthRecords } = await supabase
      .from("health_records")
      .select("*", { count: "exact", head: true });

    // 식단 기록
    const { count: totalMealRecords } = await supabase
      .from("meal_records")
      .select("*", { count: "exact", head: true });

    // 운동 기록
    const { count: totalGymRecords } = await supabase
      .from("gym_records")
      .select("*", { count: "exact", head: true });

    // 오늘 활성 사용자 (물 로그, 식단, 운동 중 하나라도 있는 사용자)
    const { data: todayWater } = await supabase
      .from("water_logs")
      .select("user_id")
      .eq("date", today);

    const { data: todayMeals } = await supabase
      .from("meal_records")
      .select("user_id")
      .eq("date", today);

    const uniqueActiveUsers = new Set([
      ...(todayWater?.map(w => w.user_id) || []),
      ...(todayMeals?.map(m => m.user_id) || []),
    ]);

    // 주간 가입자 추이 (최근 7일)
    const weeklySignups: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${dateStr}T00:00:00`)
        .lt("created_at", `${dateStr}T23:59:59`);
      
      weeklySignups.push(count || 0);
    }

    setStats({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      totalHealthRecords: totalHealthRecords || 0,
      totalMealRecords: totalMealRecords || 0,
      totalGymRecords: totalGymRecords || 0,
      activeUsersToday: uniqueActiveUsers.size,
      weeklySignups,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getDayLabel = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - daysAgo));
    return date.toLocaleDateString('ko-KR', { weekday: 'short' });
  };

  const maxSignup = Math.max(...stats.weeklySignups, 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">서비스 통계</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 주요 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                전체 회원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                프리미엄
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.premiumUsers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {stats.totalUsers > 0 ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                오늘 활성
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{stats.activeUsersToday}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                DAU 비율
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats.totalUsers > 0 ? ((stats.activeUsersToday / stats.totalUsers) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 콘텐츠 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              콘텐츠 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalHealthRecords.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">건강검진 기록</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalMealRecords.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">식단 기록</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalGymRecords.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">운동 기록</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주간 가입자 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>주간 가입자 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {stats.weeklySignups.map((count, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary/80 rounded-t-lg transition-all"
                    style={{ 
                      height: `${(count / maxSignup) * 100}%`,
                      minHeight: count > 0 ? '8px' : '0'
                    }}
                  />
                  <span className="text-xs font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground">{getDayLabel(idx)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
