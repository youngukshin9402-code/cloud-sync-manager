import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, UserCog, RefreshCw, Plus, Users } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";

export default function AdminCoaches() {
  const navigate = useNavigate();
  const { coaches, users, loading, changeUserRole, refreshData } = useAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredCoaches = coaches.filter(coach =>
    coach.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 코치가 배정된 사용자 수 계산
  const getAssignedUserCount = (coachId: string) => {
    return users.filter(user => user.assigned_coach_id === coachId).length;
  };

  const eligibleUsers = users.filter(user => 
    user.user_type === 'user' || user.user_type === 'guardian'
  );

  const handlePromoteToCoach = async () => {
    if (!selectedUserId) return;
    await changeUserRole(selectedUserId, 'coach');
    setShowPromoteDialog(false);
    setSelectedUserId(null);
  };

  const handleDemote = async (coachId: string) => {
    if (!confirm('이 코치를 일반 사용자로 변경하시겠습니까?')) return;
    await changeUserRole(coachId, 'user');
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
          <h1 className="text-xl font-bold">코치 관리</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
            <Button size="sm" onClick={() => setShowPromoteDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              코치 추가
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="코치 이름 또는 ID 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        <p className="text-sm text-muted-foreground mb-4">총 {filteredCoaches.length}명의 코치</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoaches.map((coach) => (
            <div key={coach.id} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-primary" />
                </div>
                <Badge className="bg-purple-100 text-purple-700">코치</Badge>
              </div>
              <h3 className="font-semibold text-lg">{coach.nickname || '이름 없음'}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                ID: {coach.id.slice(0, 8)}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Users className="w-4 h-4" />
                <span>배정된 회원: {getAssignedUserCount(coach.id)}명</span>
              </div>
              <p className="text-xs text-muted-foreground">
                가입일: {new Date(coach.created_at).toLocaleDateString('ko-KR')}
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDemote(coach.id)}
                >
                  일반 사용자로 변경
                </Button>
              </div>
            </div>
          ))}

          {filteredCoaches.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              등록된 코치가 없습니다
            </div>
          )}
        </div>
      </main>

      {/* 코치 추가 다이얼로그 */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>사용자를 코치로 승격</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {eligibleUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                승격할 수 있는 사용자가 없습니다
              </p>
            ) : (
              eligibleUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <p className="font-medium">{user.nickname || '이름 없음'}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.user_type === 'user' ? '일반 사용자' : '보호자'}
                  </p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
              취소
            </Button>
            <Button 
              onClick={handlePromoteToCoach}
              disabled={!selectedUserId}
            >
              코치로 승격
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
