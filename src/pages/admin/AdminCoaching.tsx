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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, UserPlus, Calendar, RefreshCw } from "lucide-react";
import { useCoachingAdmin } from "@/hooks/useAdminHooks";

const STATUS_OPTIONS = [
  { value: 'scheduled', label: '예정', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: '진행중', color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: '완료', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: '취소', color: 'bg-red-100 text-red-700' },
];

export default function AdminCoaching() {
  const navigate = useNavigate();
  const { sessions, coaches, loading, assignCoach, refetch } = useCoachingAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedCoachId, setSelectedCoachId] = useState("");

  const getStatusBadge = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? (
      <Badge className={found.color}>{found.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const filteredSessions = sessions.filter(s => 
    s.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.coach_nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedSession || !selectedCoachId) return;
    await assignCoach(selectedSession.id, selectedCoachId);
    setShowAssignDialog(false);
    setSelectedSession(null);
    setSelectedCoachId("");
  };

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
          <h1 className="text-xl font-bold">코칭 관리</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="고객명 또는 코치명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        <p className="text-sm text-muted-foreground mb-4">총 {filteredSessions.length}건</p>

        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div key={session.id} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {new Date(session.scheduled_at).toLocaleString('ko-KR')}
                    </span>
                    {getStatusBadge(session.status || 'scheduled')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    고객: <span className="font-medium text-foreground">{session.user_nickname || '알 수 없음'}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    코치: <span className="font-medium text-foreground">{session.coach_nickname || '미배정'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedSession(session);
                      setSelectedCoachId(session.coach_id || "");
                      setShowAssignDialog(true);
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    코치 배정
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredSessions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              코칭 세션이 없습니다
            </div>
          )}
        </div>
      </main>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>코치 배정</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedSession?.user_nickname}님의 코칭 세션에 코치를 배정합니다
            </p>
            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
              <SelectTrigger>
                <SelectValue placeholder="코치 선택" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAssign} disabled={!selectedCoachId}>
              배정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
