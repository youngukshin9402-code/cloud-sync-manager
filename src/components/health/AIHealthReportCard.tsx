/**
 * AI 건강 분석 + 관리자 검토 카드
 * 건강검진 영역에서만 사용
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface AIHealthReport {
  id: string;
  source_type: string;
  status: string;
  ai_result: any;
  created_at: string;
}

interface AIHealthReview {
  id: string;
  review_status: string;
  review_note: string | null;
  overrides: any;
  created_at: string;
}

interface Props {
  sourceRecordId?: string;
}

export function AIHealthReportCard({ sourceRecordId }: Props) {
  const { user } = useAuth();
  const [report, setReport] = useState<AIHealthReport | null>(null);
  const [review, setReview] = useState<AIHealthReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // AI 분석 리포트 조회
        let query = supabase
          .from('ai_health_reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('source_type', 'health_checkup')
          .order('created_at', { ascending: false });
        
        if (sourceRecordId) {
          query = query.eq('source_record_id', sourceRecordId);
        }
        
        const { data: reportData, error: reportError } = await query.limit(1).maybeSingle();

        if (reportError) {
          console.error('Error fetching AI report:', reportError);
        }

        if (reportData) {
          setReport(reportData);
          
          // 해당 리포트의 검토 조회 (published만)
          const { data: reviewData, error: reviewError } = await supabase
            .from('ai_health_reviews')
            .select('*')
            .eq('report_id', reportData.id)
            .eq('review_status', 'published')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (reviewError) {
            console.error('Error fetching review:', reviewError);
          }

          if (reviewData) {
            setReview(reviewData);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime 구독: 리뷰 변경 시 즉시 반영
    const channel = supabase
      .channel('ai_health_reviews_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_health_reviews',
        },
        (payload) => {
          // 새 리뷰가 published 되었을 때만 반영
          const newReview = payload.new as AIHealthReview;
          if (newReview && newReview.review_status === 'published') {
            // 현재 report와 매칭되는지 확인
            if (report && (payload.new as any).report_id === report.id) {
              setReview(newReview);
            } else {
              // report_id가 없을 수 있으니 전체 refetch
              fetchData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sourceRecordId, report?.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!report) {
    return null;
  }

  // overrides 있으면 우선 적용
  const displayResult = review?.overrides 
    ? { ...report.ai_result, ...review.overrides }
    : report.ai_result;

  return (
    <div className="space-y-4">
      {/* AI 분석 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-primary" />
              AI 건강 분석
            </CardTitle>
            <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
              {report.status === 'completed' ? '분석 완료' : '분석 중'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayResult?.summary && (
            <p className="text-sm text-foreground">{displayResult.summary}</p>
          )}
          
          {displayResult?.health_score !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">건강 점수:</span>
              <span className="font-semibold text-lg text-primary">{displayResult.health_score}점</span>
            </div>
          )}

          {displayResult?.recommendations && displayResult.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">권장사항</p>
              <ul className="space-y-1">
                {displayResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-health-green shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {displayResult?.risk_factors && displayResult.risk_factors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">주의 항목</p>
              <ul className="space-y-1">
                {displayResult.risk_factors.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 검토 카드 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-primary" />
              전문가 검토
            </CardTitle>
            {review ? (
              <Badge className="bg-health-green text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                검토 완료
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                <Clock className="w-3 h-3 mr-1" />
                검토 대기
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {review ? (
            <div className="space-y-2">
              {review.review_note && (
                <p className="text-sm text-foreground">{review.review_note}</p>
              )}
              <p className="text-xs text-muted-foreground">
                검토일: {new Date(review.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              전문가 검토가 진행 중입니다. 검토가 완료되면 여기에 코멘트가 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
