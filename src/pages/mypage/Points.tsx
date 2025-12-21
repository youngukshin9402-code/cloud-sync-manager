import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins, TrendingUp, TrendingDown, Gift, ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";

interface PointHistoryItem {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export default function PointsPage() {
  const { user, profile } = useAuth();
  const { currentPoints, refreshPoints } = useDailyData();
  const [history, setHistory] = useState<PointHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('point_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error('Error fetching point history:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshPoints();
    fetchHistory();

    // 실시간 구독 설정
    if (!user) return;
    
    const channel = supabase
      .channel('point_history_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'point_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // 포인트 내역 변경 시 다시 fetch
          fetchHistory();
          refreshPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshPoints]);

  // 미션 관련 reason들 (하루 1회만 카운트)
  const DAILY_MISSION_REASONS = ['일일 미션 완료', '오늘의 미션 3개 완료'];
  
  // 중복 제거 로직: 미션 관련 reason은 같은 날짜에 1개만 카운트
  const getDeduplicatedHistory = () => {
    const seenDates = new Set<string>(); // 미션 적립된 날짜 추적
    const deduplicated: PointHistoryItem[] = [];
    const duplicateIds = new Set<string>();
    
    // 시간순 정렬 (오래된 것 먼저) - 첫 번째 기록만 유효하게
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    sortedHistory.forEach(item => {
      const dateStr = item.created_at.split('T')[0]; // YYYY-MM-DD
      
      // 미션 관련 reason은 하루 1회만
      if (DAILY_MISSION_REASONS.includes(item.reason)) {
        if (seenDates.has(dateStr)) {
          duplicateIds.add(item.id);
        } else {
          seenDates.add(dateStr);
          deduplicated.push(item);
        }
      } else {
        deduplicated.push(item);
      }
    });
    
    return { deduplicated, duplicateIds };
  };

  const { deduplicated, duplicateIds } = getDeduplicatedHistory();
  
  // 총계는 중복 제거된 기준으로 계산
  const earnTotal = deduplicated.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0);
  const spendTotal = deduplicated.filter(h => h.amount < 0).reduce((sum, h) => sum + Math.abs(h.amount), 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">포인트 내역</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Balance - 서버 데이터 사용 */}
        <div className="bg-gradient-to-r from-primary to-yanggaeng-amber rounded-3xl p-6 text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-8 h-8" />
            <span className="text-lg font-medium">보유 포인트</span>
          </div>
          <p className="text-4xl font-bold">{currentPoints.toLocaleString()}P</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 text-health-green mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">총 적립</span>
            </div>
            <p className="text-xl font-bold">+{earnTotal.toLocaleString()}P</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm font-medium">총 사용</span>
            </div>
            <p className="text-xl font-bold">-{spendTotal.toLocaleString()}P</p>
          </div>
        </div>

        {/* History */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">적립/사용 내역</h2>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map(item => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.amount > 0 ? 'bg-health-green/10' : 'bg-destructive/10'
                    }`}>
                      {item.amount > 0 ? (
                        <Gift className="w-5 h-5 text-health-green" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.reason}</p>
                        {duplicateIds.has(item.id) && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            중복(과거 버그)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    item.amount > 0 ? 'text-health-green' : 'text-destructive'
                  }`}>
                    {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}P
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>포인트 내역이 없습니다</p>
              <p className="text-sm">미션을 완료하고 포인트를 모아보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}