/**
 * 관리자 결제관리 페이지
 * 결제 성공 계정 목록 + 취소/환불 기능
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  CreditCard,
  User,
  Calendar,
  Ban,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PaymentRecord {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string | null;
  amount: number;
  status: string;
  provider: string;
  payment_key: string | null;
  paid_at: string | null;
  created_at: string;
  user_nickname?: string;
  product_name?: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기', className: 'bg-gray-100 text-gray-700' },
  { value: 'paid', label: '결제완료', className: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: '취소됨', className: 'bg-red-100 text-red-700' },
  { value: 'failed', label: '실패', className: 'bg-red-100 text-red-700' },
  { value: 'refunded', label: '환불완료', className: 'bg-amber-100 text-amber-700' },
];

export default function AdminPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'cancelled'>('all');
  
  const [cancelTarget, setCancelTarget] = useState<PaymentRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // 사용자 닉네임 조회
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const nicknameMap = new Map<string, string>(
          profiles?.map(p => [p.id, p.nickname || '사용자']) || []
        );

        // 상품 정보 조회
        const productIds = data.filter(p => p.product_id).map(p => p.product_id);
        let productMap = new Map<string, string>();
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
          products?.forEach(p => productMap.set(p.id, p.name));
        }

        const paymentsWithData = data.map(p => ({
          ...p,
          user_nickname: nicknameMap.get(p.user_id) || '사용자',
          product_name: p.product_id ? productMap.get(p.product_id) || '상품' : '결제',
        }));

        setPayments(paymentsWithData);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast({ title: "데이터 로드 실패", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 실시간 구독
  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel("payments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCancelPayment = async () => {
    if (!cancelTarget) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: 'refunded' })
        .eq("id", cancelTarget.id);

      if (error) throw error;

      // 관련 주문도 취소 처리
      await supabase
        .from("orders")
        .update({ status: 'refunded' })
        .eq("id", cancelTarget.order_id);

      toast({ title: "환불 처리 완료" });
      setCancelTarget(null);
      fetchPayments();
    } catch (error) {
      console.error("Cancel error:", error);
      toast({ title: "환불 처리 실패", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return (
      <Badge className={option?.className || "bg-gray-100 text-gray-700"}>
        {option?.label || status}
      </Badge>
    );
  };

  // 필터링
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.order_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'paid') return matchesSearch && p.status === 'paid';
    if (statusFilter === 'cancelled') return matchesSearch && (p.status === 'cancelled' || p.status === 'refunded');
    return matchesSearch;
  });

  // 통계
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
  const refundedCount = payments.filter(p => p.status === 'refunded' || p.status === 'cancelled').length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">결제 관리</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPayments}
            className="text-white hover:bg-white/20 ml-auto"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-white/90">결제 현황 및 환불 관리</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="사용자 또는 주문번호 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            전체
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('paid')}
          >
            결제완료
          </Button>
          <Button
            variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('cancelled')}
          >
            취소/환불
          </Button>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{paidCount}</p>
              <p className="text-xs text-muted-foreground">결제완료</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-primary">₩{paidAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">결제 금액</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{refundedCount}</p>
              <p className="text-xs text-muted-foreground">환불</p>
            </CardContent>
          </Card>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>결제 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{payment.user_nickname}</span>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      <p className="text-lg font-bold text-primary">
                        ₩{payment.amount.toLocaleString()}
                      </p>
                      
                      <p className="text-sm text-muted-foreground">
                        {payment.product_name}
                      </p>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(payment.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        주문번호: {payment.order_id.slice(0, 8)}...
                      </p>
                    </div>

                    {/* 결제 완료 상태일 때만 환불 버튼 표시 */}
                    {payment.status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelTarget(payment)}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        환불
                      </Button>
                    )}

                    {/* 환불 완료 표시 */}
                    {(payment.status === 'refunded' || payment.status === 'cancelled') && (
                      <Badge variant="outline" className="text-muted-foreground">
                        환불완료
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 환불 확인 Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>환불 처리 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.user_nickname}님의 결제를 환불 처리하시겠습니까?
              <br />
              <span className="font-semibold">
                금액: ₩{cancelTarget?.amount.toLocaleString()}
              </span>
              <br />
              <span className="text-destructive text-sm">
                이 작업은 취소할 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelPayment}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? '처리 중...' : '환불 처리'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
