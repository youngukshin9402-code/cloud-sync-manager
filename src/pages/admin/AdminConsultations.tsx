import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  MessageSquare,
  Phone,
  Target,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ConsultationRequest {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  goal: string | null;
  message: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_nickname?: string; // 계정 닉네임 추가
}

const STATUS_OPTIONS = [
  { value: "pending", label: "대기", className: "bg-yellow-100 text-yellow-700" },
  { value: "reviewed", label: "검토완료", className: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "연락완료", className: "bg-green-100 text-green-700" },
  { value: "rejected", label: "거절", className: "bg-red-100 text-red-700" },
];

export default function AdminConsultations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("consultation_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // 사용자 닉네임 조회
      const userIds = (data || []).map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);
      
      const nicknameMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);
      
      const requestsWithNicknames = (data || []).map(r => ({
        ...r,
        user_nickname: nicknameMap.get(r.user_id) || undefined,
      }));
      
      setRequests(requestsWithNicknames);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({ title: "데이터 로드 실패", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 실시간 구독
  useEffect(() => {
    fetchRequests();

    // Realtime subscription
    const channel = supabase
      .channel("consultation-requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consultation_requests",
        },
        (payload) => {
          console.log("Realtime update:", payload);
          
          if (payload.eventType === "INSERT") {
            setRequests((prev) => [payload.new as ConsultationRequest, ...prev]);
            toast({ title: "새 상담 신청", description: `${(payload.new as ConsultationRequest).name}님이 신청했습니다` });
          } else if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              prev.map((r) => (r.id === payload.new.id ? (payload.new as ConsultationRequest) : r))
            );
          } else if (payload.eventType === "DELETE") {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) return;

    try {
      const { error } = await supabase
        .from("consultation_requests")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;
      
      toast({ title: "상태 업데이트 완료" });
      setSelectedRequest(null);
      setNewStatus("");
    } catch (error) {
      console.error("Update error:", error);
      toast({ title: "업데이트 실패", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge className={option?.className || "bg-gray-100 text-gray-700"}>
        {option?.label || status}
      </Badge>
    );
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.name.includes(searchQuery) ||
      r.phone.includes(searchQuery) ||
      (r.goal && r.goal.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">상담 신청 관리</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchRequests}
            className="text-white hover:bg-white/20 ml-auto"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-white/90">실시간으로 상담 신청을 확인하세요</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="이름, 연락처, 목표 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {requests.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-xs text-yellow-700">대기</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {requests.filter((r) => r.status === "reviewed").length}
            </p>
            <p className="text-xs text-blue-700">검토</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {requests.filter((r) => r.status === "contacted").length}
            </p>
            <p className="text-xs text-green-700">연락완료</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-600">{requests.length}</p>
            <p className="text-xs text-gray-600">전체</p>
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>상담 신청이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-card rounded-2xl border border-border p-4 space-y-3"
                onClick={() => {
                  setSelectedRequest(request);
                  setNewStatus(request.status);
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{request.name}</p>
                      {request.user_nickname && (
                        <Badge variant="outline" className="text-xs">
                          @{request.user_nickname}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {request.phone}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {request.goal && (
                  <p className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    {request.goal}
                  </p>
                )}

                {request.message && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                    {request.message}
                  </p>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(parseISO(request.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상태 변경 Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상담 신청 상세</DialogTitle>
            <DialogDescription>
              {selectedRequest?.name}님의 상담 신청
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">연락처</p>
                <p className="font-medium">{selectedRequest.phone}</p>
              </div>

              {selectedRequest.goal && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">건강 목표</p>
                  <p className="font-medium">{selectedRequest.goal}</p>
                </div>
              )}

              {selectedRequest.message && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">추가 메시지</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedRequest.message}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">상태 변경</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              취소
            </Button>
            <Button onClick={handleStatusUpdate}>
              <CheckCircle className="w-4 h-4 mr-2" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
