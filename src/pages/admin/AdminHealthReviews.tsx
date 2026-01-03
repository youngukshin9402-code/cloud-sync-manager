/**
 * 관리자 건강검진 HITL 검토 페이지
 * 사용자별 2단 구조: 사용자 목록 → 해당 사용자 리포트 목록
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Brain,
  User,
  ChevronRight,
} from 'lucide-react';
import { HealthRecordDetailSheet } from '@/components/health/HealthRecordDetailSheet';

interface UserWithReports {
  id: string;
  nickname: string;
  reportCount: number;
  pendingCount: number;
  latestDate: string;
}

interface AIHealthReport {
  id: string;
  user_id: string;
  source_type: string;
  source_record_id: string | null;
  status: string;
  ai_result: any;
  input_snapshot: any;
  created_at: string;
  user_nickname?: string;
  raw_image_urls?: string[];
}

export default function AdminHealthReviews() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [usersWithReports, setUsersWithReports] = useState<UserWithReports[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<AIHealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedReport, setSelectedReport] = useState<AIHealthReport | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // 사용자별 리포트 요약 조회
  const fetchUsersWithReports = async () => {
    setLoading(true);
    
    try {
      // 모든 리포트 조회
      const { data: allReports, error } = await supabase
        .from('ai_health_reports')
        .select('user_id, status, created_at')
        .eq('source_type', 'health_checkup');

      if (error) throw error;

      if (!allReports || allReports.length === 0) {
        setUsersWithReports([]);
        setLoading(false);
        return;
      }

      // 사용자별 그룹화
      const userMap = new Map<string, { count: number; pending: number; latest: string }>();
      allReports.forEach(r => {
        const existing = userMap.get(r.user_id) || { count: 0, pending: 0, latest: r.created_at };
        existing.count++;
        if (r.status === 'pending') existing.pending++;
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
        pendingCount: data.pending,
        latestDate: data.latest,
      }));

      // 최신순 정렬
      users.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
      setUsersWithReports(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast({ title: '데이터 로드 실패', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 특정 사용자의 리포트 목록 조회
  const fetchUserReports = async (userId: string) => {
    setLoadingReports(true);
    
    try {
      const { data, error } = await supabase
        .from('ai_health_reports')
        .select('*')
        .eq('source_type', 'health_checkup')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const sourceRecordIds = data.filter(r => r.source_record_id).map(r => r.source_record_id);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .eq('id', userId);

        let recordsMap = new Map<string, any>();
        if (sourceRecordIds.length > 0) {
          const { data: records } = await supabase
            .from('health_records')
            .select('id, raw_image_urls')
            .in('id', sourceRecordIds);
          records?.forEach(r => recordsMap.set(r.id, r));
        }

        const reportsWithData = data.map(r => ({
          ...r,
          user_nickname: profiles?.[0]?.nickname || '사용자',
          raw_image_urls: r.source_record_id ? recordsMap.get(r.source_record_id)?.raw_image_urls || [] : [],
        }));

        setReports(reportsWithData);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast({ title: '리포트 로드 실패', variant: 'destructive' });
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsersWithReports();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserReports(selectedUserId);
    }
  }, [selectedUserId]);

  const handleViewReport = (report: AIHealthReport) => {
    setSelectedReport(report);
    setDetailSheetOpen(true);
  };

  const handleBack = () => {
    setSelectedUserId(null);
    setReports([]);
  };

  // 필터링
  const filteredUsers = usersWithReports.filter(user =>
    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild={!selectedUserId} onClick={selectedUserId ? handleBack : undefined}>
              {selectedUserId ? (
                <ArrowLeft className="w-5 h-5" />
              ) : (
                <Link to="/admin">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              )}
            </Button>
            <h1 className="text-xl font-bold">
              {selectedUserId 
                ? `${usersWithReports.find(u => u.id === selectedUserId)?.nickname}님의 AI 분석`
                : '건강검진 AI 검토'}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={selectedUserId ? () => fetchUserReports(selectedUserId) : fetchUsersWithReports}>
            <RefreshCw className="w-4 h-4 mr-1" />
            새로고침
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 검색 */}
        {!selectedUserId && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="사용자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* 사용자 목록 (1단계) */}
        {!selectedUserId && (
          <>
            {/* 통계 */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{usersWithReports.length}</p>
                  <p className="text-xs text-muted-foreground">사용자</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {usersWithReports.reduce((acc, u) => acc + u.pendingCount, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">검토 대기</p>
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
              <div className="text-center py-12">
                <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">건강검진 AI 분석 기록이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <Card 
                    key={user.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedUserId(user.id)}
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
                              {user.reportCount}건의 분석
                              {user.pendingCount > 0 && (
                                <span className="text-yellow-600 ml-2">({user.pendingCount}건 대기)</span>
                              )}
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
              <div className="text-center py-12">
                <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">분석 기록이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewReport(report)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {new Date(report.created_at).toLocaleDateString('ko-KR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                            {report.status === 'completed' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                분석완료
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                대기중
                              </>
                            )}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 상세보기 Sheet */}
      {selectedReport && (
        <HealthRecordDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          record={selectedReport.source_record_id ? {
            id: selectedReport.source_record_id,
            user_id: selectedReport.user_id,
            raw_image_urls: selectedReport.raw_image_urls || [],
            status: selectedReport.status,
            created_at: selectedReport.created_at,
          } : null}
          userNickname={selectedReport.user_nickname}
        />
      )}
    </div>
  );
}
