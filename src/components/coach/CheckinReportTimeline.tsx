/**
 * 체크인 리포트 타임라인 컴포넌트
 * 전체: 사용자 계정별 그룹핑
 * 오늘: 오늘 업로드된 모든 활동 카드 표시
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckinReportCard } from './CheckinReportCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  ClipboardCheck, 
  Calendar, 
  Users, 
  ChevronDown, 
  ChevronRight,
  User 
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CheckinReport {
  id: string;
  user_id: string;
  report_date: string;
  sent_at: string;
  version_number: number;
  summary: any;
  snapshot_data: any;
  user_nickname?: string;
}

interface CheckinReportTimelineProps {
  userId?: string; // 특정 사용자 필터
  limit?: number;
  showSearch?: boolean;
  showTabs?: boolean;
  onUserClick?: (userId: string, nickname: string, reportDate?: string) => void;
}

export function CheckinReportTimeline({ 
  userId, 
  limit = 50, 
  showSearch = true,
  showTabs = true,
  onUserClick 
}: CheckinReportTimelineProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<CheckinReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      setLoading(true);
      
      let query = (supabase.from('checkin_reports') as any)
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // '오늘' 필터일 때만 날짜 필터 적용
      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('report_date', today);
      }

      const { data, error } = await query;

      if (!error && data) {
        // 사용자 닉네임 매핑
        const userIds = [...new Set(data.map((r: any) => r.user_id))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const nicknameMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);
        
        const reportsWithNicknames = data.map((r: any) => ({
          ...r,
          user_nickname: nicknameMap.get(r.user_id) || '사용자',
        }));

        setReports(reportsWithNicknames);
      }
      
      setLoading(false);
    };

    fetchReports();
  }, [user, userId, dateFilter, limit]);

  // 검색 필터
  const filteredReports = reports.filter(report => 
    !searchQuery || 
    report.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 사용자별 그룹핑 (전체 탭용)
  const groupedByUser = filteredReports.reduce((acc, report) => {
    const uid = report.user_id;
    if (!acc[uid]) {
      acc[uid] = {
        nickname: report.user_nickname || '사용자',
        reports: [],
      };
    }
    acc[uid].reports.push(report);
    return acc;
  }, {} as Record<string, { nickname: string; reports: CheckinReport[] }>);

  const sortedUserIds = Object.keys(groupedByUser).sort((a, b) => {
    const aLatest = groupedByUser[a].reports[0]?.sent_at || '';
    const bLatest = groupedByUser[b].reports[0]?.sent_at || '';
    return bLatest.localeCompare(aLatest);
  });

  // 날짜별 그룹핑 (오늘 탭용)
  const groupedByDate = filteredReports.reduce((acc, report) => {
    const date = report.report_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  }, {} as Record<string, CheckinReport[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const toggleUserExpand = (uid: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      {showSearch && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="사용자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {showTabs && (
        <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as 'all' | 'today')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="text-sm">
              <Users className="w-4 h-4 mr-2" />
              전체
            </TabsTrigger>
            <TabsTrigger value="today" className="text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              오늘
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* 리포트 목록 */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">리포트가 없습니다</p>
            <p className="text-sm mt-1">
              {dateFilter === 'today' 
                ? '오늘 받은 리포트가 없습니다.' 
                : '아직 받은 리포트가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : dateFilter === 'all' ? (
        /* 전체: 사용자 계정별 그룹핑 */
        <div className="space-y-3">
          {sortedUserIds.map(uid => {
            const userData = groupedByUser[uid];
            const isExpanded = expandedUsers.has(uid);
            
            return (
              <div 
                key={uid} 
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* 사용자 헤더 (클릭 시 활동 다이얼로그 열기 또는 펼침/접힘) */}
                <div className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <button
                    onClick={() => {
                      if (onUserClick) {
                        // onUserClick이 있으면 활동 다이얼로그 열기
                        const latestReportDate = userData.reports[0]?.report_date;
                        onUserClick(uid, userData.nickname, latestReportDate);
                      } else {
                        // 없으면 펼침/접힘
                        toggleUserExpand(uid);
                      }
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{userData.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        총 {userData.reports.length}개의 활동 카드
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {userData.reports.length}건
                    </Badge>
                    <button onClick={() => toggleUserExpand(uid)}>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 펼쳐진 리포트 목록 */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userData.reports
                        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
                        .map(report => (
                          <CheckinReportCard 
                            key={report.id} 
                            report={report} 
                            compact={userData.reports.length > 1}
                          />
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 오늘: 날짜별 표시 (기존 방식) */
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">
                  {format(new Date(date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {groupedByDate[date].length}건
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByDate[date]
                  .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
                  .map(report => (
                    <CheckinReportCard 
                      key={report.id} 
                      report={report} 
                      compact={groupedByDate[date].length > 1}
                    />
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
