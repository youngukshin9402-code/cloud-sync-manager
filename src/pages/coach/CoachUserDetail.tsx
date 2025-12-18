import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Heart,
  Activity,
  FileText,
  Target,
  Plus,
  Check,
  X,
  Video,
  Loader2,
} from "lucide-react";

interface UserProfile {
  id: string;
  nickname: string | null;
  phone: string | null;
  subscription_tier: string;
  current_points: number;
  created_at: string;
}

interface HealthRecord {
  id: string;
  status: string;
  health_age: number | null;
  health_tags: string[] | null;
  parsed_data: any;
  created_at: string;
  coach_comment: string | null;
}

interface Mission {
  id: string;
  content: string;
  points: number;
  is_active: boolean;
}

export default function CoachUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [newMission, setNewMission] = useState({ content: "", points: 10 });
  const [savingMission, setSavingMission] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      setLoading(true);

      // 프로필
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) setUserProfile(profile);

      // 건강 기록
      const { data: records } = await supabase
        .from("health_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setHealthRecords(records || []);

      // 미션
      const { data: missionData } = await supabase
        .from("mission_templates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setMissions(missionData || []);

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const handleReview = async (status: "completed" | "rejected") => {
    if (!selectedRecord || !user) return;

    setReviewing(true);

    const { error } = await supabase
      .from("health_records")
      .update({
        status,
        coach_comment: reviewComment,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedRecord.id);

    setReviewing(false);

    if (error) {
      toast({
        title: "검토 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: status === "completed" ? "검토 완료" : "반려 완료",
    });

    setShowReviewDialog(false);
    setSelectedRecord(null);
    setReviewComment("");

    // 새로고침
    const { data } = await supabase
      .from("health_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setHealthRecords(data || []);
  };

  const handleAddMission = async () => {
    if (!userId || !user || !newMission.content) return;

    setSavingMission(true);

    const { error } = await supabase.from("mission_templates").insert({
      user_id: userId,
      coach_id: user.id,
      content: newMission.content,
      points: newMission.points,
      is_active: true,
    });

    setSavingMission(false);

    if (error) {
      toast({
        title: "미션 추가 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "미션 추가 완료" });
    setShowMissionDialog(false);
    setNewMission({ content: "", points: 10 });

    // 새로고침
    const { data } = await supabase
      .from("mission_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setMissions(data || []);
  };

  const toggleMission = async (missionId: string, isActive: boolean) => {
    await supabase
      .from("mission_templates")
      .update({ is_active: !isActive })
      .eq("id", missionId);

    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, is_active: !isActive } : m))
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge className="bg-amber-100 text-amber-700">검토 대기</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700">완료</Badge>;
      case "rejected":
        return <Badge variant="destructive">반려</Badge>;
      case "analyzing":
        return <Badge className="bg-blue-100 text-blue-700">분석중</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>회원을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{userProfile.nickname}님</h1>
            <p className="text-sm text-muted-foreground">회원 상세 정보</p>
          </div>
          <div className="ml-auto">
            <Button onClick={() => navigate(`/video-call/new?userId=${userId}`)}>
              <Video className="mr-2 h-4 w-4" />
              영상 코칭
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">연락처</p>
              <p className="font-medium">{userProfile.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">구독</p>
              <Badge
                variant={
                  userProfile.subscription_tier === "premium"
                    ? "default"
                    : "secondary"
                }
              >
                {userProfile.subscription_tier === "premium" ? "프리미엄" : "베이직"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">보유 포인트</p>
              <p className="font-medium">{userProfile.current_points.toLocaleString()}P</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">가입일</p>
              <p className="font-medium">
                {format(parseISO(userProfile.created_at), "yyyy.MM.dd", {
                  locale: ko,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 건강검진 기록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              건강검진 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                건강검진 기록이 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {healthRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(parseISO(record.created_at), "yyyy년 M월 d일", {
                          locale: ko,
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(record.status)}
                        {record.health_age && (
                          <span className="text-sm text-muted-foreground">
                            건강나이: {record.health_age}세
                          </span>
                        )}
                      </div>
                      {record.coach_comment && (
                        <p className="text-sm text-muted-foreground mt-1">
                          코멘트: {record.coach_comment}
                        </p>
                      )}
                    </div>
                    {record.status === "pending_review" && (
                      <Button
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowReviewDialog(true);
                        }}
                      >
                        검토하기
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 미션 관리 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              미션 관리
            </CardTitle>
            <Button size="sm" onClick={() => setShowMissionDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              미션 추가
            </Button>
          </CardHeader>
          <CardContent>
            {missions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                설정된 미션이 없습니다
              </p>
            ) : (
              <div className="space-y-2">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      mission.is_active ? "bg-muted/30" : "bg-muted/10 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className={!mission.is_active ? "line-through" : ""}>
                        {mission.content}
                      </span>
                      <Badge variant="outline">{mission.points}P</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMission(mission.id, mission.is_active)}
                    >
                      {mission.is_active ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 검토 Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>건강검진 검토</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">코치 코멘트</label>
            <Textarea
              placeholder="회원에게 전달할 코멘트를 작성하세요..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleReview("rejected")}
              disabled={reviewing}
            >
              <X className="mr-1 h-4 w-4" />
              반려
            </Button>
            <Button onClick={() => handleReview("completed")} disabled={reviewing}>
              {reviewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미션 추가 Dialog */}
      <Dialog open={showMissionDialog} onOpenChange={setShowMissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 미션 추가</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">미션 내용</label>
              <Input
                placeholder="예: 아침 스트레칭 10분"
                value={newMission.content}
                onChange={(e) =>
                  setNewMission((prev) => ({ ...prev, content: e.target.value }))
                }
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">포인트</label>
              <Input
                type="number"
                value={newMission.points}
                onChange={(e) =>
                  setNewMission((prev) => ({
                    ...prev,
                    points: parseInt(e.target.value) || 10,
                  }))
                }
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMissionDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddMission} disabled={savingMission}>
              {savingMission ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
