import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCoachData } from "@/hooks/useCoachData";
import { useCoachNotifications } from "@/hooks/useCoachNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoachFeedbackForm } from "@/components/CoachFeedbackForm";
import { WeeklyMetricsCard } from "@/components/coach/WeeklyMetricsCard";
import { CheckinReportTimeline } from "@/components/coach/CheckinReportTimeline";
import { CoachNotificationSettingsDialog } from "@/components/coach/CoachNotificationSettingsDialog";
import { PendingReviewsDialog } from "@/components/coach/PendingReviewsDialog";
import { CoachingRecordsDialog } from "@/components/coach/CoachingRecordsDialog";
import { ChatPopupDialog } from "@/components/coach/ChatPopupDialog";
import { UserActivityDialog } from "@/components/coach/UserActivityDialog";
import {
  Users,
  Search,
  FileText,
  AlertCircle,
  Clock,
  MessageSquare,
  BarChart3,
  ClipboardCheck,
  Bell,
  Video,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";


export default function CoachDashboard() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { assignedUsers, pendingReviews, todaySessions, loading } = useCoachData();
  
  // 알림 훅 활성화
  useCoachNotifications();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackUserId, setFeedbackUserId] = useState<string | null>(null);
  const [feedbackUserNickname, setFeedbackUserNickname] = useState<string>("");
  
  // 다이얼로그 상태
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPendingReviews, setShowPendingReviews] = useState(false);
  const [showCoachingRecords, setShowCoachingRecords] = useState(false);
  
  // 채팅 팝업 상태
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [chatUserNickname, setChatUserNickname] = useState<string>("");
  
  // 활동 카드 다이얼로그 상태
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [activityUserNickname, setActivityUserNickname] = useState<string>("");
  const [activityInitialDate, setActivityInitialDate] = useState<Date | undefined>(undefined);

  const filteredUsers = assignedUsers.filter((user) =>
    user.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openFeedbackForm = (userId: string, nickname: string) => {
    setFeedbackUserId(userId);
    setFeedbackUserNickname(nickname || "사용자");
  };

  const openChatPopup = (userId: string, nickname: string) => {
    setChatUserId(userId);
    setChatUserNickname(nickname || "사용자");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-0 md:h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              <span className="md:hidden">코치<br />대시보드</span>
              <span className="hidden md:inline">코치 대시보드</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 md:mt-0">
              {profile?.nickname}님, 환영합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowNotificationSettings(true)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="로그아웃">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">담당 회원</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {assignedUsers.length}명
            </p>
          </div>

          <button 
            className="bg-card rounded-2xl border border-border p-6 text-left hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setShowPendingReviews(true)}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span className="text-muted-foreground">검토 대기</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {pendingReviews.length}건
            </p>
          </button>

          <button 
            className="bg-card rounded-2xl border border-border p-6 text-left hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setShowCoachingRecords(true)}
          >
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-sky-600" />
              <span className="text-muted-foreground">오늘 코칭</span>
            </div>
            <p className="text-3xl font-bold text-sky-600">{todaySessions.length}건</p>
          </button>
        </div>

        {/* 검토 대기 알림 */}
        {pendingReviews.length > 0 && (
          <button 
            className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-amber-100/50 transition-colors"
            onClick={() => setShowPendingReviews(true)}
          >
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                검토가 필요한 건강검진 결과가 {pendingReviews.length}건 있어요
              </p>
              <p className="text-sm text-amber-600">
                클릭하여 검토 항목을 확인하세요
              </p>
            </div>
          </button>
        )}

        {/* 담당 회원 리스트 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold whitespace-nowrap">담당 회원</h2>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="회원 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-48 md:w-64"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "담당 회원이 없습니다"}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* 모바일용 카드 레이아웃 */}
              <div className="md:hidden divide-y divide-border">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-medium">
                            {user.nickname?.[0] || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.nickname || "이름없음"}</p>
                          {user.pendingReview && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              검토 대기
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{user.lastActive}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/coach/user/${user.id}`)}
                      >
                        상세
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openChatPopup(user.id, user.nickname || "")}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크탑용 테이블 레이아웃 */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      회원
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      최근활동
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {user.nickname?.[0] || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.nickname || "이름없음"}</p>
                            {user.pendingReview && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                검토 대기
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {user.lastActive}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/coach/user/${user.id}`)}
                          >
                            상세
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChatPopup(user.id, user.nickname || "")}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 배정 사용자 7일 지표 */}
        {assignedUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">최근 7일 지표</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedUsers.slice(0, 6).map((user) => (
                <WeeklyMetricsCard
                  key={user.id}
                  userId={user.id}
                  nickname={user.nickname || "사용자"}
                />
              ))}
            </div>
          </div>
        )}

        {/* 오늘의 활동 카드 타임라인 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">오늘의 활동 카드</h2>
          </div>
          <CheckinReportTimeline 
            limit={30}
            onUserClick={(userId, nickname, reportDate) => {
              setActivityUserId(userId);
              setActivityUserNickname(nickname);
              setActivityInitialDate(reportDate ? new Date(reportDate) : undefined);
            }}
          />
        </div>

        {/* 피드백 작성 폼 */}
        {feedbackUserId && (
          <CoachFeedbackForm
            userId={feedbackUserId}
            userNickname={feedbackUserNickname}
            onSuccess={() => setFeedbackUserId(null)}
            onCancel={() => setFeedbackUserId(null)}
          />
        )}
      </main>

      {/* 알림 설정 다이얼로그 */}
      <CoachNotificationSettingsDialog
        open={showNotificationSettings}
        onOpenChange={setShowNotificationSettings}
      />

      {/* 검토 대기 다이얼로그 */}
      <PendingReviewsDialog
        open={showPendingReviews}
        onOpenChange={setShowPendingReviews}
      />

      {/* 코칭 기록 다이얼로그 */}
      <CoachingRecordsDialog
        open={showCoachingRecords}
        onOpenChange={setShowCoachingRecords}
      />

      {/* 채팅 팝업 다이얼로그 */}
      {chatUserId && (
        <ChatPopupDialog
          open={!!chatUserId}
          onOpenChange={(open) => !open && setChatUserId(null)}
          userId={chatUserId}
          userNickname={chatUserNickname}
        />
      )}

      {/* 활동 카드 다이얼로그 */}
      {activityUserId && (
        <UserActivityDialog
          open={!!activityUserId}
          onOpenChange={(open) => {
            if (!open) {
              setActivityUserId(null);
              setActivityInitialDate(undefined);
            }
          }}
          userId={activityUserId}
          userNickname={activityUserNickname}
          initialDate={activityInitialDate}
        />
      )}
    </div>
  );
}
