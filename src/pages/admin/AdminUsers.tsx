import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Search, UserCog, Crown, Heart, Eye, RefreshCw } from "lucide-react";
import { UserProfileModal } from "@/components/admin/UserProfileModal";

interface GuardianRelation {
  userId: string;
  guardianIds: string[];
}

interface WardRelation {
  guardianId: string;
  wardIds: string[];
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { users, coaches, loading, assignCoach, refreshData } = useAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string>("__none__");
  
  // 프로필 상세보기 모달
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileViewUser, setProfileViewUser] = useState<any>(null);
  
  // 보호자 연동 관계 (사용자 → 보호자들)
  const [guardianRelations, setGuardianRelations] = useState<Map<string, string[]>>(new Map());
  // 피보호자 연동 관계 (보호자 → 피보호자들)
  const [wardRelations, setWardRelations] = useState<Map<string, string[]>>(new Map());
  // 닉네임 맵 (모든 관련 유저)
  const [nicknameMap, setNicknameMap] = useState<Map<string, string>>(new Map());

  // 보호자/피보호자 연동 관계 로드
  const fetchGuardianConnections = async () => {
    const { data: connections } = await supabase
      .from('guardian_connections')
      .select('user_id, guardian_id')
      .not('guardian_id', 'is', null);

    if (!connections) return;

    // 사용자별 보호자 ID 매핑
    const guardianMap = new Map<string, string[]>();
    // 보호자별 피보호자 ID 매핑
    const wardMap = new Map<string, string[]>();
    const allUserIds = new Set<string>();

    connections.forEach(conn => {
      if (conn.guardian_id && conn.user_id !== conn.guardian_id) {
        // 사용자 → 보호자
        const existingGuardians = guardianMap.get(conn.user_id) || [];
        existingGuardians.push(conn.guardian_id);
        guardianMap.set(conn.user_id, existingGuardians);
        
        // 보호자 → 피보호자
        const existingWards = wardMap.get(conn.guardian_id) || [];
        existingWards.push(conn.user_id);
        wardMap.set(conn.guardian_id, existingWards);
        
        allUserIds.add(conn.user_id);
        allUserIds.add(conn.guardian_id);
      }
    });

    setGuardianRelations(guardianMap);
    setWardRelations(wardMap);

    // 닉네임 조회
    if (allUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', Array.from(allUserIds));

      const nickMap = new Map<string, string>();
      (profiles || []).forEach(p => nickMap.set(p.id, p.nickname || '사용자'));
      setNicknameMap(nickMap);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchGuardianConnections();
    }
  }, [loading]);

  // Realtime 구독 - profiles 테이블 변경 감지
  useEffect(() => {
    const channel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          // 프로필 변경 시 데이터 새로고침
          refreshData?.();
          fetchGuardianConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const filteredUsers = users.filter(
    (u) =>
      u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
  );

  const handleAssignCoach = async () => {
    if (!selectedUser) return;
    await assignCoach(selectedUser.id, selectedCoach === "__none__" ? null : selectedCoach || null);
    setShowAssignDialog(false);
    setSelectedUser(null);
    setSelectedCoach("__none__");
  };

  // 사용자의 보호자 닉네임 목록
  const getGuardianNames = (userId: string): string[] => {
    const guardianIds = guardianRelations.get(userId) || [];
    return guardianIds.map(id => nicknameMap.get(id) || '보호자');
  };

  // 보호자의 피보호자 닉네임 목록
  const getWardNames = (guardianId: string): string[] => {
    const wardIds = wardRelations.get(guardianId) || [];
    return wardIds.map(id => nicknameMap.get(id) || '사용자');
  };

  const handleViewProfile = (user: any) => {
    setProfileViewUser(user);
    setShowProfileModal(true);
  };

  const handleRefresh = () => {
    refreshData?.();
    fetchGuardianConnections();
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
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">사용자 관리</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <p className="text-muted-foreground">총 {users.length}명</p>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 연락처 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 모바일: 카드 리스트 */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => {
            const guardianNames = getGuardianNames(user.id);
            const wardNames = getWardNames(user.id);
            return (
              <div key={user.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
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
                  {user.subscription_tier === "premium" && (
                    <Badge className="bg-amber-100 text-amber-700">
                      <Crown className="w-3 h-3 mr-1" />
                      프리미엄
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">
                    {user.user_type === "guardian" ? "보호자" : "일반"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {user.current_points?.toLocaleString() || 0}P
                  </span>
                </div>

                {/* 보호자 표시 (사용자 입장) */}
                {guardianNames.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span className="text-sm text-rose-700 dark:text-rose-400">
                      보호자: {guardianNames.join(', ')}
                    </span>
                  </div>
                )}

                {/* 피보호자 표시 (보호자 입장) */}
                {wardNames.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-sky-50 dark:bg-sky-950/30 rounded-lg">
                    <Heart className="w-4 h-4 text-sky-500" />
                    <span className="text-sm text-sky-700 dark:text-sky-400">
                      피보호자: {wardNames.join(', ')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    담당: {user.assigned_coach_id
                      ? coaches.find((c) => c.id === user.assigned_coach_id)?.nickname || "-"
                      : "-"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(user)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      상세
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedCoach(user.assigned_coach_id || "__none__");
                        setShowAssignDialog(true);
                      }}
                    >
                      <UserCog className="w-4 h-4 mr-1" />
                      코치
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 데스크톱 테이블 */}
        <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">회원</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">유형</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">구독</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">보호자</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">피보호자</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">담당 코치</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const guardianNames = getGuardianNames(user.id);
                  const wardNames = getWardNames(user.id);
                  return (
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
                        {guardianNames.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Heart className="w-4 h-4 text-rose-500" />
                            <span className="text-sm">{guardianNames.join(', ')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">미연동</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {wardNames.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Heart className="w-4 h-4 text-sky-500" />
                            <span className="text-sm">{wardNames.join(', ')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {user.assigned_coach_id
                          ? coaches.find((c) => c.id === user.assigned_coach_id)?.nickname || "-"
                          : "-"}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProfile(user)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            상세
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedCoach(user.assigned_coach_id || "__none__");
                              setShowAssignDialog(true);
                            }}
                          >
                            <UserCog className="w-4 h-4 mr-1" />
                            코치
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 코치 배정 다이얼로그 */}
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
                <SelectItem value="__none__">배정 없음</SelectItem>
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

      {/* 프로필 상세보기 모달 */}
      <UserProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={profileViewUser}
      />
    </div>
  );
}
