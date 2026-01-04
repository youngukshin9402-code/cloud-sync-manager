import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Heart,
  FileText,
  Camera,
  Loader2,
  Upload,
  Download,
} from "lucide-react";
import { useHealthRecords, HealthRecord, ParsedHealthData } from "@/hooks/useHealthRecords";
import { AIHealthReportCard } from "@/components/health/AIHealthReportCard";
import HealthShareCard from "@/components/health/HealthShareCard";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

const StatusBadge = ({ status }: { status: 'normal' | 'warning' | 'danger' | null }) => {
  if (!status) return null;
  
  const config = {
    normal: { label: '정상', color: 'bg-health-green/10 text-health-green', icon: CheckCircle },
    warning: { label: '주의', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
    danger: { label: '관리필요', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  };
  
  const { label, color, icon: Icon } = config[status];
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

export default function HealthCheckup() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const {
    records,
    currentRecord,
    isLoading,
    isUploading,
    uploadHealthCheckup,
    deleteRecord,
  } = useHealthRecords();
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [examDate, setExamDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareImageUrls, setShareImageUrls] = useState<string[]>([]);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      setShowUploadDialog(true);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "이미지를 선택해주세요", variant: "destructive" });
      return;
    }

    const result = await uploadHealthCheckup(selectedFiles, examDate);
    if (result) {
      setShowUploadDialog(false);
      setSelectedFiles([]);
    }
  };

  const handleDelete = async (recordId: string) => {
    await deleteRecord(recordId);
  };

  // AI 분석 데이터 가져오기
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);

  // 이미지로 저장하기
  const handleSaveAsImage = async (record: HealthRecord) => {
    if (!record) return;
    
    setIsSavingImage(true);
    try {
      // 이미지 URL 생성
      if (record.raw_image_urls && record.raw_image_urls.length > 0) {
        const urls = await Promise.all(
          record.raw_image_urls.map(async (path) => {
            const { data } = await supabase.storage
              .from('health-checkups')
              .createSignedUrl(path, 3600);
            return data?.signedUrl || '';
          })
        );
        setShareImageUrls(urls.filter(Boolean));
      }

      // AI 분석 데이터 가져오기 (ai_health_reports에서)
      const { data: aiReport } = await supabase
        .from('ai_health_reports')
        .select('ai_result')
        .eq('source_record_id', record.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // ai_result 또는 parsed_data 사용
      const analysisData = aiReport?.ai_result || record.parsed_data;
      setAiAnalysisData(analysisData);
      
      setShowShareCard(true);
      
      // 이미지 로딩 및 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (shareCardRef.current) {
        const canvas = await html2canvas(shareCardRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        
        const link = document.createElement('a');
        link.download = `건강검진_${format(new Date(), 'yyyyMMdd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        toast({ title: "이미지가 저장되었습니다" });
      }
    } catch (error) {
      console.error('Image save error:', error);
      toast({ title: "이미지 저장 실패", variant: "destructive" });
    } finally {
      setIsSavingImage(false);
      setShowShareCard(false);
    }
  };

  // AI 분석이 완료되면 이미지 저장 버튼 표시 (코치 코멘트는 선택)
  const canSaveAsImage = (record: HealthRecord) => {
    // parsed_data가 있거나 status가 completed면 AI 분석 완료된 것으로 판단
    // 코치 코멘트가 없어도 AI 분석만 있으면 저장 가능
    return !!record.parsed_data || record.status === 'completed' || !!record.coach_comment;
  };

  // Count statuses from parsed_data
  const getStatusSummary = (parsedData: ParsedHealthData | null) => {
    if (!parsedData?.items) return { normal: 0, warning: 0, danger: 0 };
    
    let normal = 0, warning = 0, danger = 0;
    parsedData.items.forEach(item => {
      if (item.status === 'normal') normal++;
      if (item.status === 'warning') warning++;
      if (item.status === 'danger') danger++;
    });
    
    return { normal, warning, danger };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const latestRecord = records[0];
  const latestParsedData = latestRecord?.parsed_data;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/medical">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">건강검진 사진 분석</h1>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} size="sm" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            업로드
          </Button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />

      <div className="p-4 space-y-6">
        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">참고용 정보</p>
            <p className="text-sm text-yellow-700">
              이 분석은 의학적 진단이 아닙니다. 정확한 진단은 의료 전문가와 상담하세요.
            </p>
          </div>
        </div>

        {/* Latest Record Summary */}
        {latestRecord && latestParsedData ? (
          <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">최근 AI 분석 결과</h2>
              <span className="text-sm text-muted-foreground">
                {latestRecord.exam_date || format(new Date(latestRecord.created_at), 'yyyy-MM-dd')}
              </span>
            </div>

            {/* 코치 코멘트 */}
            {latestRecord.coach_comment && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-1">💬 코치 코멘트</p>
                <p className="text-foreground">{latestRecord.coach_comment}</p>
              </div>
            )}

            {/* 주요 문제 - 항상 요약 형태로 표시 */}
            {latestParsedData.key_issues && latestParsedData.key_issues.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-red-600 mb-2">⚠️ 주요 문제</h4>
                <ul className="space-y-1">
                  {latestParsedData.key_issues.map((issue: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 권장 행동 - 항상 요약 형태로 표시 */}
            {latestParsedData.action_items && latestParsedData.action_items.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-emerald-600 mb-2">✅ 권장 행동</h4>
                <ul className="space-y-1">
                  {latestParsedData.action_items.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 이미지로 저장하기 버튼 - AI 분석이 있으면 표시 (코치 코멘트 불필요) */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSaveAsImage(latestRecord)}
              disabled={isSavingImage}
            >
              {isSavingImage ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              이미지로 저장하기
            </Button>
          </div>
        ) : latestRecord && !latestParsedData ? (
          <div className="bg-card rounded-3xl border border-border p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-primary animate-spin" />
            <p className="font-medium">AI가 분석 중입니다...</p>
            <p className="text-sm text-muted-foreground">잠시 후 결과가 표시됩니다</p>
            
            {/* 분석 중이어도 코치 코멘트가 있으면 이미지 저장 가능 */}
            {latestRecord.coach_comment && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleSaveAsImage(latestRecord)}
                disabled={isSavingImage}
              >
                {isSavingImage ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                이미지로 저장하기
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">건강검진 기록이 없습니다</p>
            <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-2" />
              검진 결과 사진 업로드
            </Button>
          </div>
        )}

        {/* AI 분석 + 관리자 검토 카드 (건강검진 영역에서만) */}
        {latestRecord && <AIHealthReportCard sourceRecordId={latestRecord.id} />}

        {/* Records List */}
        {records.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">업로드 기록</h2>
            <div className="space-y-2">
              {records.map(record => {
                const { normal, warning, danger } = getStatusSummary(record.parsed_data);
                const statusLabel = 
                  record.status === 'completed' ? '분석 완료' :
                  record.status === 'analyzing' ? '분석 중' :
                  record.status === 'pending_review' ? '검토 대기' : '업로드 중';
                
                return (
                  <div
                    key={record.id}
                    className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {record.exam_date || format(new Date(record.created_at), 'yyyy-MM-dd')}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className={
                          record.status === 'completed' ? 'text-health-green' :
                          record.status === 'analyzing' ? 'text-primary' : 'text-muted-foreground'
                        }>
                          {statusLabel}
                        </span>
                        {record.status === 'completed' && (
                          <>
                            {normal > 0 && <span className="text-health-green">정상 {normal}</span>}
                            {warning > 0 && <span className="text-yellow-600">주의 {warning}</span>}
                            {danger > 0 && <span className="text-destructive">관리 {danger}</span>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {/* 이미지로 저장 버튼 */}
                      {canSaveAsImage(record) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveAsImage(record)}
                          disabled={isSavingImage}
                        >
                          {isSavingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-primary" />
                          )}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[90vw] max-w-[340px] mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle>기록을 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(record.id)}>
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>건강검진 사진 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">검진일</label>
              <Input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">선택된 파일</label>
              <div className="bg-muted p-3 rounded-xl">
                {selectedFiles.map((file, idx) => (
                  <p key={idx} className="text-sm truncate">{file.name}</p>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>취소</Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              업로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Share Card for Image Export */}
      {showShareCard && latestRecord && (
        <div className="fixed left-[-9999px] top-0">
          <HealthShareCard
            ref={shareCardRef}
            record={latestRecord}
            imageUrls={shareImageUrls}
            aiAnalysis={aiAnalysisData}
          />
        </div>
      )}
    </div>
  );
}
