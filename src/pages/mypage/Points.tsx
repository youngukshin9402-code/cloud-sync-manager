import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Coins, TrendingUp, TrendingDown, Gift, ShoppingBag } from "lucide-react";
import { getPoints, getPointHistory, PointHistory } from "@/lib/localStorage";

export default function PointsPage() {
  const [points, setPointsState] = useState(0);
  const [history, setHistory] = useState<PointHistory[]>([]);

  useEffect(() => {
    setPointsState(getPoints());
    setHistory(getPointHistory().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const earnTotal = history.filter(h => h.type === 'earn').reduce((sum, h) => sum + h.amount, 0);
  const spendTotal = history.filter(h => h.type === 'spend').reduce((sum, h) => sum + h.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
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
        {/* Current Balance */}
        <div className="bg-gradient-to-r from-primary to-yanggaeng-amber rounded-3xl p-6 text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-8 h-8" />
            <span className="text-lg font-medium">보유 포인트</span>
          </div>
          <p className="text-4xl font-bold">{points.toLocaleString()}P</p>
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
                      item.type === 'earn' ? 'bg-health-green/10' : 'bg-destructive/10'
                    }`}>
                      {item.type === 'earn' ? (
                        <Gift className="w-5 h-5 text-health-green" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.reason}</p>
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    item.type === 'earn' ? 'text-health-green' : 'text-destructive'
                  }`}>
                    {item.type === 'earn' ? '+' : '-'}{item.amount.toLocaleString()}P
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
