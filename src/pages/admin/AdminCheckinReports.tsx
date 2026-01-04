/**
 * 관리자 오늘의 활동 카드 페이지
 * 사용자별 2단 구조: 사용자 목록 → 해당 사용자 활동 카드 목록
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ArrowLeft, ClipboardCheck, RefreshCw, Search, User, ChevronRight, Calendar, Activity, Utensils, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckinReportCard } from "@/components/coach/CheckinReportCard";

interface UserWithReports {
  id: string;
  nickname: string;
  reportCount: number;
  latestDate: string;
}

interface CheckinReport {
  id: string;
  user_id: string;
  coach_id: string;
  report_date: string;
  sent_at: string;
  summary: any;
  snapshot_data: any;
  created_at: string;
  version_number?: number;
}

export default function AdminCheckinReports() {
  const [usersWithReports, setUsersWithReports] = useState<UserWithReports[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserNickname, setSelectedUserNickname] = useState<string>("");
  const [reports, setReports] = useState<CheckinReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedReport, setSelectedReport] = useState<CheckinReport | null>(null);

  // 사용자별 리포트 요약 조회
  const fetchUsersWithReports = async () => {
    setLoading(true);
    
    try {
      const { data: allReports, error } = await supabase
        .from('checkin_reports')
        .select('user_id, created_at');

      if (error) throw error;

      if (!allReports || allReports.length === 0) {
        setUsersWithReports([]);
        setLoading(false);
        return;
      }

      // 사용자별 그룹화
      const userMap = new Map<string, { count: number; latest: string }>();
      allReports.forEach(r => {
        const existing = userMap.get(r.user_id) || { count: 0, latest: r.created_at };
        existing.count++;
        if (new Date(r.created_at) > new Date(existing.latest)) existing.latest = r.created_at;
        userMap.set(r.user_id, existing);
      });

      // 닉네임 조회
      const userIds = Array.from(userMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      const nicknameMap = new Map<string, string>(profiles?.map(p => [p.id, p.nickname || '사용자']) || []);

      const users: UserWithReports[] = Array.from(userMap.entries()).map(([userId, data]) => ({
        id: userId,
        nickname: nicknameMap.get(userId) || '사용자',
        reportCount: data.count,
        latestDate: data.latest,
      }));

      // 최신순 정렬
      users.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
      setUsersWithReports(users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // 특정 사용자의 리포트 목록 조회
  const fetchUserReports = async (userId: string) => {
    setLoadingReports(true);
    
    try {
      const { data, error } = await supabase
        .from('checkin_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchUsersWithReports();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserReports(selectedUserId);
    }
  }, [selectedUserId]);

  const handleBack = () => {
    setSelectedUserId(null);
    setSelectedUserNickname("");
    setReports([]);
  };

  const handleSelectUser = (user: UserWithReports) => {
    setSelectedUserId(user.id);
    setSelectedUserNickname(user.nickname);
  };

  // 필터링
  const filteredUsers = usersWithReports.filter(user =>
    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={selectedUserId ? handleBack : undefined}
            asChild={!selectedUserId}
          >
            {selectedUserId ? (
              <ArrowLeft className="w-5 h-5" />
            ) : (
              <Link to="/admin">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {selectedUserId ? `${selectedUserNickname}님의 활동 카드` : '오늘의 활동 카드'}
            </h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={selectedUserId ? () => fetchUserReports(selectedUserId) : fetchUsersWithReports}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* 사용자 목록 (1단계) */}
        {!selectedUserId && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="사용자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 통계 - 활동 카드 사용자 수만 표시 */}
            <Card className="mb-6">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{usersWithReports.length}</p>
                <p className="text-xs text-muted-foreground">활동 카드 사용자</p>
              </CardContent>
            </Card>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>활동 카드가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <Card 
                    key={user.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectUser(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.nickname}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.reportCount}건의 활동 카드
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 리포트 목록 (2단계) */}
        {selectedUserId && (
          <>
            {loadingReports ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>활동 카드가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const summary = report.summary as any;
                  return (
                    <Card 
                      key={report.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedReport(report)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {format(new Date(report.report_date), 'yyyy년 M월 d일', { locale: ko })}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.sent_at), 'HH:mm', { locale: ko })}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="bg-muted/50 rounded-lg p-2">
                            <Utensils className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                            <p className="text-xs text-muted-foreground">식사</p>
                            <p className="font-medium">{summary?.mealCount || 0}끼</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2">
                            <Activity className="w-4 h-4 mx-auto mb-1 text-green-500" />
                            <p className="text-xs text-muted-foreground">운동</p>
                            <p className="font-medium">{summary?.exerciseDone ? '완료' : '미완료'}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2">
                            <Moon className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                            <p className="text-xs text-muted-foreground">수면</p>
                            <p className="font-medium">{summary?.sleepHours || 0}시간</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* 리포트 상세 Dialog - 코치탭과 동일한 형식 */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedReport && (
            <CheckinReportCard 
              report={{
                id: selectedReport.id,
                user_id: selectedReport.user_id,
                report_date: selectedReport.report_date,
                sent_at: selectedReport.sent_at,
                version_number: selectedReport.version_number || 1,
                summary: selectedReport.summary,
                snapshot_data: selectedReport.snapshot_data,
                user_nickname: selectedUserNickname,
              }}
              compact={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
