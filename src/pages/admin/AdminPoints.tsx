import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Coins, TrendingUp, Gift, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PointStats {
  totalDistributed: number;
  totalUsers: number;
  avgPointsPerUser: number;
  todayDistributed: number;
}

export default function AdminPoints() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PointStats>({
    totalDistributed: 0,
    totalUsers: 0,
    avgPointsPerUser: 0,
    todayDistributed: 0,
  });
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // 전체 포인트 분배량
    const { data: pointData } = await supabase
      .from("point_history")
      .select("amount");

    const totalDistributed = pointData?.reduce((sum, p) => sum + (p.amount > 0 ? p.amount : 0), 0) || 0;

    // 포인트 보유 사용자 수
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt("current_points", 0);

    // 오늘 분배량
    const { data: todayData } = await supabase
      .from("point_history")
      .select("amount")
      .gte("created_at", `${today}T00:00:00`)
      .gt("amount", 0);

    const todayDistributed = todayData?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // 최근 포인트 히스토리
    const { data: history } = await supabase
      .from("point_history")
      .select(`
        *,
        profiles!point_history_user_id_fkey(nickname)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    setStats({
      totalDistributed,
      totalUsers: totalUsers || 0,
      avgPointsPerUser: totalUsers ? Math.round(totalDistributed / totalUsers) : 0,
      todayDistributed,
    });
    setRecentHistory(history || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          <h1 className="text-xl font-bold">포인트 정책</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Coins className="w-4 h-4" />
                총 분배 포인트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalDistributed.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gift className="w-4 h-4" />
                오늘 분배
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">+{stats.todayDistributed.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                보유자 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}명</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                평균 보유량
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgPointsPerUser.toLocaleString()}P</p>
            </CardContent>
          </Card>
        </div>

        {/* 포인트 적립 기준 */}
        <Card>
          <CardHeader>
            <CardTitle>포인트 적립 기준</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span>미션 완료</span>
              <span className="font-semibold text-primary">+10P</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span>식단 기록</span>
              <span className="font-semibold text-primary">+5P</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span>운동 기록</span>
              <span className="font-semibold text-primary">+5P</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span>물 섭취 목표 달성</span>
              <span className="font-semibold text-primary">+3P</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span>건강검진 업로드</span>
              <span className="font-semibold text-primary">+50P</span>
            </div>
          </CardContent>
        </Card>

        {/* 최근 포인트 히스토리 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 포인트 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentHistory.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{(item as any).profiles?.nickname || '알 수 없음'}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount}P
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
              {recentHistory.length === 0 && (
                <p className="text-center text-muted-foreground py-4">포인트 내역이 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
