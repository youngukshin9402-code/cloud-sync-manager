/**
 * 건강검진 상세보기 Sheet (코치/관리자용)
 * 업로드 사진 + AI 분석 + 코멘트를 한 화면에 표시
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Image as ImageIcon,
  Brain,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  X,
  Loader2,
} from 'lucide-react';

interface HealthRecord {
  id: string;
  user_id: string;
  raw_image_urls: string[];
  status: string;
  health_age?: number;
  health_tags?: string[];
  coach_comment?: string;
  created_at: string;
}

interface AIReport {
  id: string;
  status: string;
  ai_result: any;
  created_at: string;
}

interface AIReview {
  id: string;
  review_status: string;
  review_note: string | null;
  admin_id: string;
  created_at: string;
}

interface Props {
  record: HealthRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userNickname?: string;
}

export function HealthRecordDetailSheet({ record, open, onOpenChange, userNickname }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [reviews, setReviews] = useState<AIReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record || !open) return;

    const fetchDetails = async () => {
      setLoading(true);
      
      try {
        // 이미지 URL 생성
        if (record.raw_image_urls && record.raw_image_urls.length > 0) {
          const urls = await Promise.all(
            record.raw_image_urls.map(async (path) => {
              const { data } = supabase.storage.from('health-checkups').getPublicUrl(path);
              return data.publicUrl;
            })
          );
          setImageUrls(urls);
        } else {
          setImageUrls([]);
        }

        // AI 리포트 조회
        const { data: reportData } = await supabase
          .from('ai_health_reports')
          .select('*')
          .eq('source_record_id', record.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (reportData) {
          setAiReport(reportData);

          // AI 리뷰 조회
          const { data: reviewsData } = await supabase
            .from('ai_health_reviews')
            .select('*')
            .eq('report_id', reportData.id)
            .order('created_at', { ascending: false });

          setReviews(reviewsData || []);
        } else {
          setAiReport(null);
          setReviews([]);
        }

        setComment(record.coach_comment || '');
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [record, open]);

  const handleSaveComment = async () => {
    if (!record || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('health_records')
        .update({
          coach_comment: comment,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({ title: '코멘트가 저장되었습니다' });
    } catch (err) {
      console.error('Error saving comment:', err);
      toast({ title: '저장 실패', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* 헤더 */}
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle>건강검진 상세</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {userNickname || '사용자'} · {new Date(record.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiReport && (
                      <Badge variant="default">
                        <Brain className="w-3 h-3 mr-1" />
                        AI 분석 완료
                      </Badge>
                    )}
                    {reviews.length > 0 && (
                      <Badge className="bg-health-green text-white">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        코멘트 있음
                      </Badge>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {/* 1. 업로드 이미지 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        업로드 사진
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {imageUrls.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {imageUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(url)}
                            >
                              <img
                                src={url}
                                alt={`건강검진 이미지 ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                              <div className="absolute bottom-2 right-2">
                                <Button size="sm" variant="secondary" className="h-7 px-2">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          업로드된 이미지가 없습니다
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 2. AI 분석 결과 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Brain className="w-5 h-5 text-primary" />
                        AI 분석 결과
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {aiReport ? (
                        <div className="space-y-3">
                          {aiReport.ai_result?.summary && (
                            <p className="text-sm">{aiReport.ai_result.summary}</p>
                          )}
                          
                          {aiReport.ai_result?.health_score !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">건강 점수:</span>
                              <span className="font-semibold text-lg text-primary">
                                {aiReport.ai_result.health_score}점
                              </span>
                            </div>
                          )}

                          {aiReport.ai_result?.recommendations?.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">권장사항</p>
                              <ul className="space-y-1">
                                {aiReport.ai_result.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-health-green shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiReport.ai_result?.risk_factors?.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">주의 항목</p>
                              <ul className="space-y-1">
                                {aiReport.ai_result.risk_factors.map((risk: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {!aiReport.ai_result && (
                            <p className="text-sm text-muted-foreground">분석 결과 데이터가 없습니다</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            AI 분석 결과가 아직 없습니다
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 3. 코멘트 영역 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        전문가 코멘트
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 기존 리뷰 히스토리 */}
                      {reviews.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {reviews.map((r) => (
                            <div key={r.id} className="bg-muted/50 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {r.review_status === 'published' ? '공개됨' : '검토중'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(r.created_at).toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                              {r.review_note && (
                                <p className="text-sm">{r.review_note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 코멘트 입력 */}
                      <div className="space-y-3">
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="코멘트를 입력하세요..."
                          rows={3}
                        />
                        <Button onClick={handleSaveComment} disabled={saving} className="w-full">
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          코멘트 저장
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        ※ 참고용이며 의료 진단/치료를 대체하지 않습니다.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 이미지 확대 Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="건강검진 이미지 확대"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}