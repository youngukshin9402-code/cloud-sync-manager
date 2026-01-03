/**
 * 관리자 체크인 리포트 페이지
 * 사용자별 2단 구조: 사용자 목록 → 해당 사용자 체크인 리포트 목록
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, ClipboardCheck, RefreshCw, Search, User, ChevronRight, Calendar, Activity, Utensils, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
              {selectedUserId ? `${selectedUserNickname}님의 체크인` : '체크인 리포트'}
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

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{usersWithReports.length}</p>
                  <p className="text-xs text-muted-foreground">체크인 사용자</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {usersWithReports.reduce((acc, u) => acc + u.reportCount, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">전체 리포트</p>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>체크인 리포트가 없습니다</p>
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
                              {user.reportCount}건의 체크인
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
                <p>체크인 리포트가 없습니다</p>
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

      {/* 리포트 상세 Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              체크인 리포트 상세
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="text-center pb-3 border-b">
                <p className="text-lg font-semibold">
                  {format(new Date(selectedReport.report_date), 'yyyy년 M월 d일', { locale: ko })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedReport.sent_at), 'a h:mm 전송', { locale: ko })}
                </p>
              </div>

              {(() => {
                const summary = selectedReport.summary as any;
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">컨디션</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span 
                            key={i} 
                            className={`text-lg ${i <= (summary?.conditionScore || 0) ? 'text-yellow-500' : 'text-muted-foreground/30'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">식사 횟수</span>
                      <span className="font-medium">{summary?.mealCount || 0}끼</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">운동 여부</span>
                      <Badge variant={summary?.exerciseDone ? 'default' : 'secondary'}>
                        {summary?.exerciseDone ? '완료' : '미완료'}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">수면 시간</span>
                      <span className="font-medium">{summary?.sleepHours || 0}시간</span>
                    </div>

                    {summary?.notes && (
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground text-sm">메모</span>
                        <p className="mt-1">{summary.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
