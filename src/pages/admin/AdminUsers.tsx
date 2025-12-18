import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Search, UserCog, Crown } from "lucide-react";

export default function AdminUsers() {
  const navigate = useNavigate();
  const { users, coaches, loading, assignCoach, changeUserRole } = useAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string>("");

  const filteredUsers = users.filter(
    (u) =>
      u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
  );

  const handleAssignCoach = async () => {
    if (!selectedUser) return;
    await assignCoach(selectedUser.id, selectedCoach || null);
    setShowAssignDialog(false);
    setSelectedUser(null);
    setSelectedCoach("");
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
          <h1 className="text-xl font-bold">사용자 관리</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">총 {users.length}명</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 연락처 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">회원</th>
                <th className="text-center p-4 font-medium text-muted-foreground">유형</th>
                <th className="text-center p-4 font-medium text-muted-foreground">구독</th>
                <th className="text-center p-4 font-medium text-muted-foreground">포인트</th>
                <th className="text-center p-4 font-medium text-muted-foreground">담당 코치</th>
                <th className="text-center p-4 font-medium text-muted-foreground">액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {user.nickname?.[0] || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.nickname || "이름없음"}</p>
                        <p className="text-sm text-muted-foreground">{user.phone || "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant="secondary">
                      {user.user_type === "guardian" ? "보호자" : "일반"}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    {user.subscription_tier === "premium" ? (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Crown className="w-3 h-3 mr-1" />
                        프리미엄
                      </Badge>
                    ) : (
                      <Badge variant="outline">베이직</Badge>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {user.current_points?.toLocaleString() || 0}P
                  </td>
                  <td className="p-4 text-center">
                    {user.assigned_coach_id
                      ? coaches.find((c) => c.id === user.assigned_coach_id)?.nickname || "-"
                      : "-"}
                  </td>
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedCoach(user.assigned_coach_id || "");
                        setShowAssignDialog(true);
                      }}
                    >
                      <UserCog className="w-4 h-4 mr-1" />
                      코치 배정
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>코치 배정</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {selectedUser?.nickname}님에게 배정할 코치를 선택하세요
            </p>
            <Select value={selectedCoach} onValueChange={setSelectedCoach}>
              <SelectTrigger>
                <SelectValue placeholder="코치 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">배정 없음</SelectItem>
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
            <Button onClick={handleAssignCoach}>배정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
