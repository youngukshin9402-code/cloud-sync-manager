import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useCoaching } from "@/hooks/useCoaching";
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
} from "lucide-react";

export default function Coaching() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    availableSlots,
    mySessions,
    coaches,
    loading,
    bookSession,
    cancelSession,
    getUpcomingSession,
  } = useCoaching();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const isPremium = profile?.subscription_tier === "premium";
  const upcomingSession = getUpcomingSession();

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

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Crown className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">프리미엄 전용 기능</h1>
        <p className="text-muted-foreground text-center mb-6">
          1:1 코칭은 프리미엄 회원만 이용할 수 있습니다
        </p>
        <Button onClick={() => navigate("/premium")} size="lg">
          <Crown className="mr-2 h-5 w-5" />
          프리미엄 가입하기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
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
    </div>
  );
}
