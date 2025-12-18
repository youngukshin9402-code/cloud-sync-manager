import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { getOrders, Order } from "@/lib/localStorage";

export default function OrdersPage() {
  const [orders, setOrdersState] = useState<Order[]>([]);

  useEffect(() => {
    setOrdersState(getOrders().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { label: '결제 대기', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'paid':
        return { label: '결제 완료', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'started':
        return { label: '진행 중', color: 'bg-health-green/10 text-health-green', icon: MessageSquare };
      case 'completed':
        return { label: '완료', color: 'bg-muted text-muted-foreground', icon: CheckCircle };
      case 'cancelled':
        return { label: '취소됨', color: 'bg-destructive/10 text-destructive', icon: XCircle };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground', icon: Clock };
    }
  };

  const getProductTypeLabel = (type: Order['productType']) => {
    switch (type) {
      case 'doctor': return '의사 코칭';
      case 'trainer': return '트레이너 코칭';
      case 'nutritionist': return '영양사 코칭';
      default: return type;
    }
  };

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
        {orders.length > 0 ? (
          orders.map(order => {
            const status = getStatusBadge(order.status);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={order.id}
                className="bg-card rounded-2xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{order.productName}</p>
                    <p className="text-sm text-muted-foreground">{getProductTypeLabel(order.productType)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{order.date}</span>
                  <span className="font-semibold">{order.price.toLocaleString()}원</span>
                </div>
                {order.status === 'started' && (
                  <Button asChild className="w-full" size="sm">
                    <Link to={`/coaching/${order.id}`}>
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
            <p>주문 내역이 없습니다</p>
            <Button asChild className="mt-4">
              <Link to="/shop">상점 둘러보기</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
