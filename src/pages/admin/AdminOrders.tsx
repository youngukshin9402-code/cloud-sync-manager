import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, Package, RefreshCw } from "lucide-react";
import { useOrdersAdmin } from "@/hooks/useAdminHooks";

const STATUS_OPTIONS = [
  { value: 'requested', label: '신청', color: 'bg-blue-100 text-blue-700' },
  { value: 'pending', label: '대기', color: 'bg-gray-100 text-gray-700' },
  { value: 'paid', label: '결제완료', color: 'bg-green-100 text-green-700' },
  { value: 'coaching_started', label: '코칭중', color: 'bg-purple-100 text-purple-700' },
  { value: 'cancel_requested', label: '취소요청', color: 'bg-amber-100 text-amber-700' },
  { value: 'cancelled', label: '취소됨', color: 'bg-red-100 text-red-700' },
  { value: 'refunded', label: '환불완료', color: 'bg-gray-100 text-gray-700' },
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus, refetch } = useOrdersAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getStatusBadge = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? (
      <Badge className={found.color}>{found.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-xl font-bold">주문 관리</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="상품명 또는 고객명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-4">총 {filteredOrders.length}건</p>

        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{order.product_name}</span>
                    {getStatusBadge(order.status || 'pending')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    고객: {order.user_nickname || '알 수 없음'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    주문번호: {order.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at || '').toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-lg font-bold text-primary">
                    ₩{order.price.toLocaleString()}
                  </p>
                  <Select 
                    value={order.status || 'pending'} 
                    onValueChange={(value) => updateOrderStatus(order.id, value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              주문 내역이 없습니다
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
