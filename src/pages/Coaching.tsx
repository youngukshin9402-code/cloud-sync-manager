import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useCoaching } from "@/hooks/useCoaching";
import { usePayment } from "@/hooks/usePayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MockPaymentModal } from "@/components/payment/MockPaymentModal";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Crown,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// 4주 코칭 패키지 상품 정보
const COACHING_PRODUCT = {
  id: "coaching_4weeks",
  name: "4주 코칭 패키지",
  price: 199000,
  description: "전문 코치와 함께하는 4주 집중 코칭",
};

export default function Coaching() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const {
    availableSlots,
    mySessions,
    coaches,
    loading,
    bookSession,
    cancelSession,
    getUpcomingSession,
  } = useCoaching();

  const {
    loading: paymentLoading,
    currentPayment,
    createPaymentIntent,
    confirmPayment,
    cancelPayment,
    checkProductPayment,
  } = usePayment();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasPaidCoaching, setHasPaidCoaching] = useState(false);

  const isPremium = profile?.subscription_tier === "premium";
  const upcomingSession = getUpcomingSession();

  // 코칭 결제 상태 확인
  useEffect(() => {
    const checkPayment = async () => {
      const paid = await checkProductPayment(COACHING_PRODUCT.id);
      setHasPaidCoaching(paid);
    };
    checkPayment();
  }, [checkProductPayment]);

  // 선택된 날짜의 슬롯 필터링
  const slotsForDate = selectedDate
    ? availableSlots.filter(
        (slot) => slot.available_date === format(selectedDate, "yyyy-MM-dd")
      )
    : [];

  // 예약 가능한 날짜들
  const availableDates = [...new Set(availableSlots.map((s) => s.available_date))];

  const handleBooking = async () => {
    if (!selectedSlot) return;

    setBooking(true);
    const scheduledAt = `${selectedSlot.available_date}T${selectedSlot.start_time}`;
    const success = await bookSession(
      selectedSlot.id,
      selectedSlot.coach_id,
      scheduledAt
    );
    setBooking(false);

    if (success) {
      setShowBookingDialog(false);
      setSelectedSlot(null);
    }
  };

  const handleCancel = async (sessionId: string) => {
    await cancelSession(sessionId);
    setShowCancelDialog(null);
  };

  const getCoachName = (coachId: string) => {
    const coach = coaches.find((c) => c.id === coachId);
    return coach?.nickname || "코치";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700">예약됨</Badge>;
      case "in_progress":
        return <Badge className="bg-green-100 text-green-700">진행중</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700">완료</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소됨</Badge>;
      default:
        return null;
    }
  };

  // 결제 처리
  const handlePayment = async () => {
    const intent = await createPaymentIntent({
      productId: COACHING_PRODUCT.id,
      productName: COACHING_PRODUCT.name,
      amount: COACHING_PRODUCT.price,
    });

    if (intent) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentConfirm = async (paymentId: string, success: boolean) => {
    const result = await confirmPayment(paymentId, success);
    
    if (result && success) {
      // 결제 성공 시 프리미엄 업그레이드
      try {
        await supabase.from("subscriptions").insert({
          user_id: profile!.id,
          payer_id: profile!.id,
          plan_type: "premium",
          price: COACHING_PRODUCT.price,
          payment_method: "mock",
          is_active: true,
          expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        });

        await supabase
          .from("profiles")
          .update({ subscription_tier: "premium" })
          .eq("id", profile!.id);

        await refreshProfile();
        setHasPaidCoaching(true);

        toast({
          title: "결제 완료! 🎉",
          description: "4주 코칭 패키지가 활성화되었습니다.",
        });
      } catch (error) {
        console.error("Subscription update error:", error);
      }
    }
    
    return result;
  };

  if (!isPremium && !hasPaidCoaching) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold">1:1 코칭</h1>
          </div>
          <p className="text-white/90">전문 코치와 함께 건강을 관리하세요</p>
        </div>

        <div className="p-4 space-y-4">
          {/* 무료 상담 신청 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                무료 상담 신청하기
              </CardTitle>
              <CardDescription>
                전문 코치에게 무료로 상담받고 코칭 프로그램을 알아보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate("/consultation")}
              >
                무료 상담 신청
              </Button>
            </CardContent>
          </Card>

          {/* 4주 코칭 패키지 결제 */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {COACHING_PRODUCT.name}
                </CardTitle>
                <Badge className="bg-primary">추천</Badge>
              </div>
              <CardDescription>
                {COACHING_PRODUCT.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-primary">
                {COACHING_PRODUCT.price.toLocaleString()}원
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  주 1회 영상 코칭 (총 4회)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  매일 1:1 채팅 피드백
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  맞춤형 미션 설정
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  식단/운동 전문 코칭
                </li>
              </ul>
              <Button 
                className="w-full h-14 text-lg" 
                onClick={handlePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-5 w-5" />
                )}
                결제하기
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Mock Payment Modal */}
        <MockPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          paymentIntent={currentPayment}
          onConfirm={handlePaymentConfirm}
          onCancel={cancelPayment}
          loading={paymentLoading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold">1:1 코칭</h1>
          <Badge className="bg-amber-500 text-white ml-auto">
            <Crown className="h-3 w-3 mr-1" />
            프리미엄
          </Badge>
        </div>
        <p className="text-white/90">전문 코치와 영상으로 상담하세요</p>
      </div>

      {/* Upcoming Session */}
      {upcomingSession && (
        <div className="p-4 -mt-4">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                <Video className="h-5 w-5" />
                다음 코칭 예약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900">
                    {format(parseISO(upcomingSession.scheduled_at), "M월 d일 (E)", {
                      locale: ko,
                    })}
                  </p>
                  <p className="text-green-700">
                    {format(parseISO(upcomingSession.scheduled_at), "a h:mm", {
                      locale: ko,
                    })}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {getCoachName(upcomingSession.coach_id)} 코치
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/video-call/${upcomingSession.id}`)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Video className="mr-2 h-4 w-4" />
                  입장하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar */}
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              예약 가능 날짜
            </CardTitle>
            <CardDescription>원하시는 날짜를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ko}
                className="rounded-md border mx-auto"
                modifiers={{
                  available: availableDates.map((d) => new Date(d)),
                }}
                modifiersStyles={{
                  available: {
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                    color: "hsl(var(--primary))",
                    fontWeight: "bold",
                  },
                }}
                disabled={(date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return !availableDates.includes(dateStr);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Slots */}
      {selectedDate && slotsForDate.length > 0 && (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {format(selectedDate, "M월 d일", { locale: ko })} 가능 시간
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {slotsForDate.map((slot) => (
              <Button
                key={slot.id}
                variant="outline"
                className="h-16 flex flex-col items-center justify-center"
                onClick={() => {
                  setSelectedSlot(slot);
                  setShowBookingDialog(true);
                }}
              >
                <span className="font-semibold">
                  {slot.start_time.slice(0, 5)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getCoachName(slot.coach_id)} 코치
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* My Sessions */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">내 예약 내역</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : mySessions.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>예약된 코칭이 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mySessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {format(parseISO(session.scheduled_at), "M월 d일 (E) a h:mm", {
                            locale: ko,
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getCoachName(session.coach_id)} 코치
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(session.status)}
                      {session.status === "scheduled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setShowCancelDialog(session.id)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>코칭 예약 확인</DialogTitle>
            <DialogDescription>
              아래 일정으로 예약하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <span>
                  {format(parseISO(selectedSlot.available_date), "yyyy년 M월 d일 (E)", {
                    locale: ko,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{selectedSlot.start_time.slice(0, 5)}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>{getCoachName(selectedSlot.coach_id)} 코치</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBookingDialog(false)}
              disabled={booking}
            >
              취소
            </Button>
            <Button onClick={handleBooking} disabled={booking}>
              {booking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  예약 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  예약하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!showCancelDialog} onOpenChange={() => setShowCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 취소</DialogTitle>
            <DialogDescription>
              정말로 이 코칭 예약을 취소하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(null)}>
              돌아가기
            </Button>
            <Button
              variant="destructive"
              onClick={() => showCancelDialog && handleCancel(showCancelDialog)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              취소하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mock Payment Modal for Premium Users */}
      <MockPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        paymentIntent={currentPayment}
        onConfirm={handlePaymentConfirm}
        onCancel={cancelPayment}
        loading={paymentLoading}
      />
    </div>
  );
}
