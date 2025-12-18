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
  Loader2 
} from "lucide-react";

export default function OrdersPage() {
  const { data: orders, loading, updateStatus } = useOrdersServer();

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: '결제 대기', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'paid':
        return { label: '결제 완료', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'cancel_requested':
        return { label: '취소 요청', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle };
      case 'cancelled':
        return { label: '취소됨', color: 'bg-destructive/10 text-destructive', icon: XCircle };
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

  const handleCancelRequest = async (orderId: string) => {
    await updateStatus(orderId, 'cancel_requested');
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

      {/* Beta Notice */}
      <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          베타 테스트 기간 주문입니다. 실제 결제가 이루어지지 않았습니다.
        </p>
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
                {/* Beta Badge */}
                {order.is_beta && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    베타 테스트
                  </div>
                )}

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

                {/* Actions based on status */}
                {order.status === 'paid' && (
                  <div className="flex gap-2">
                    <Button asChild className="flex-1" size="sm">
                      <Link to="/coaching">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        코칭 바로가기
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCancelRequest(order.id)}
                    >
                      취소 요청
                    </Button>
                  </div>
                )}

                {order.status === 'cancel_requested' && (
                  <p className="text-sm text-orange-600 bg-orange-50 rounded-lg p-2">
                    취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.
                  </p>
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
