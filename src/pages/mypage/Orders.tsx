import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOrdersServer, OrderStatus } from "@/hooks/useServerSync";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  AlertTriangle,
  Loader2,
  Play
} from "lucide-react";

export default function OrdersPage() {
  const { data: orders, loading } = useOrdersServer();

  // 결제 완료(paid) 또는 코칭 시작(coaching_started) 상태만 표시
  const confirmedOrders = orders.filter(
    order => order.status === 'paid' || order.status === 'coaching_started'
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'paid':
        return { label: '결제 완료', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'coaching_started':
        return { label: '코칭 진행중', color: 'bg-green-100 text-green-700', icon: Play };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground', icon: Clock };
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'doctor': return '의사 코칭';
      case 'trainer': return '트레이너 코칭';
      case 'nutritionist': return '영양사 코칭';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">주문 내역</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {confirmedOrders.length > 0 ? (
          confirmedOrders.map(order => {
            const status = getStatusBadge(order.status);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={order.id}
                className="bg-card rounded-2xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground">{getProductTypeLabel(order.product_type)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="font-semibold">{order.price.toLocaleString()}원</span>
                </div>

                {order.payment_method && (
                  <p className="text-xs text-muted-foreground">
                    결제수단: {order.payment_method}
                  </p>
                )}

                {(order.status === 'paid' || order.status === 'coaching_started') && (
                  <Button asChild className="w-full" size="sm">
                    <Link to="/coaching">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      코칭 바로가기
                    </Link>
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>결제 완료된 주문이 없습니다</p>
            <Button asChild className="mt-4">
              <Link to="/coaching">코칭 신청하기</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
