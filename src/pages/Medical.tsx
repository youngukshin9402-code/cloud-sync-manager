import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  Share2,
  MessageCircle,
  CalendarIcon,
  Activity,
  Scale,
} from "lucide-react";
import { useHealthRecords, HealthRecord, HealthRecordItem } from "@/hooks/useHealthRecords";
import { useInBodyRecords } from "@/hooks/useServerSync";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: "normal" | "warning" | "danger" }) {
  const styles = {
    normal: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  };
  const labels = {
    normal: "정상",
    warning: "주의",
    danger: "관리 필요",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function HealthItemCard({ item }: { item: HealthRecordItem }) {
  const dotColors = {
    normal: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  const bgColors = {
    normal: "bg-emerald-50",
    warning: "bg-amber-50",
    danger: "bg-red-50",
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${bgColors[item.status]}`}>
      <div className={`w-3 h-3 rounded-full ${dotColors[item.status]}`} />
      <div className="flex-1">
        <span className="font-medium">{item.name}</span>
        <span className="text-muted-foreground ml-2">
          {item.value} {item.unit}
        </span>
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}

// InBody 섹션 컴포넌트
function InBodySection() {
  const { data: records, loading, add, update, remove } = useInBodyRecords();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: 0,
    skeletal_muscle: null as number | null,
    body_fat: null as number | null,
    body_fat_percent: null as number | null,
    bmr: null as number | null,
    visceral_fat: null as number | null,
  });

  const handleSave = async () => {
    if (!formData.weight || !formData.date) {
      toast.error("체중과 날짜는 필수입니다");
      return;
    }
    if (isSaving) return; // 중복 클릭 방지

    setIsSaving(true);
    try {
      if (editingId) {
        const result = await update(editingId, formData);
        if (result.error) {
          toast.error("수정 실패: " + (result.error.message || "네트워크 오류"));
        } else {
          toast.success("수정되었습니다");
          setDialogOpen(false);
          resetForm();
        }
      } else {
        const result = await add(formData);
        if (result.error) {
          toast.error("저장 실패: " + (result.error.message || "네트워크 오류"));
        } else {
          toast.success("저장되었습니다");
          setDialogOpen(false);
          resetForm();
        }
      }
    } catch (err: any) {
      toast.error("오류 발생: " + (err?.message || "알 수 없는 오류"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: typeof records[0]) => {
    setEditingId(record.id);
    setFormData({
      date: record.date,
      weight: Number(record.weight),
      skeletal_muscle: record.skeletal_muscle ? Number(record.skeletal_muscle) : null,
      body_fat: record.body_fat ? Number(record.body_fat) : null,
      body_fat_percent: record.body_fat_percent ? Number(record.body_fat_percent) : null,
      bmr: record.bmr,
      visceral_fat: record.visceral_fat,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return; // 중복 삭제 방지
    
    setDeletingId(id);
    try {
      const result = await remove(id);
      if (result.error) {
        toast.error("삭제 실패: " + (result.error.message || "네트워크 오류"));
      } else {
        toast.success("삭제되었습니다");
      }
    } catch (err: any) {
      toast.error("오류 발생: " + (err?.message || "알 수 없는 오류"));
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: 0,
      skeletal_muscle: null,
      body_fat: null,
      body_fat_percent: null,
      bmr: null,
      visceral_fat: null,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const latestRecord = records[0];

  return (
    <div className="space-y-6">
      {/* 최근 기록 요약 */}
      {latestRecord ? (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">최근 기록</h3>
            <span className="text-sm text-muted-foreground">{latestRecord.date}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">체중</span>
              </div>
              <span className="text-xl font-bold">{Number(latestRecord.weight).toFixed(1)}kg</span>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-health-blue" />
                <span className="text-sm text-muted-foreground">골격근량</span>
              </div>
              <span className="text-xl font-bold">{latestRecord.skeletal_muscle ? `${Number(latestRecord.skeletal_muscle).toFixed(1)}kg` : '-'}</span>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">체지방률</span>
              </div>
              <span className="text-xl font-bold">{latestRecord.body_fat_percent ? `${Number(latestRecord.body_fat_percent).toFixed(1)}%` : '-'}</span>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">기초대사량</span>
              </div>
              <span className="text-xl font-bold">{latestRecord.bmr ? `${latestRecord.bmr}kcal` : '-'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">인바디 기록이 없습니다</p>
        </div>
      )}

      {/* 기록 추가 버튼 */}
      <Button className="w-full h-12" onClick={() => { resetForm(); setDialogOpen(true); }}>
        인바디 기록 추가
      </Button>

      {/* 기록 목록 */}
      {records.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">기록 목록</h3>
          {records.map(record => (
            <div key={record.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{record.date}</p>
                <p className="text-sm text-muted-foreground">
                  {Number(record.weight).toFixed(1)}kg / 골격근 {record.skeletal_muscle ? Number(record.skeletal_muscle).toFixed(1) : '-'}kg
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} disabled={isSaving}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={deletingId === record.id}>
                      {deletingId === record.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(record.id)} disabled={!!deletingId}>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 인바디 입력 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인바디 수정" : "인바디 기록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">날짜 *</label>
              <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">체중 (kg) *</label>
                <Input type="number" step="0.1" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">골격근량 (kg)</label>
                <Input type="number" step="0.1" value={formData.skeletal_muscle || ''} onChange={e => setFormData({ ...formData, skeletal_muscle: parseFloat(e.target.value) || null })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">체지방률 (%)</label>
                <Input type="number" step="0.1" value={formData.body_fat_percent || ''} onChange={e => setFormData({ ...formData, body_fat_percent: parseFloat(e.target.value) || null })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">기초대사량</label>
                <Input type="number" value={formData.bmr || ''} onChange={e => setFormData({ ...formData, bmr: parseInt(e.target.value) || null })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>취소</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Medical() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editExamDate, setEditExamDate] = useState<Date | undefined>(undefined);
  
  // 로컬 로딩 상태 (Hook 수정 없이 UI에서 처리)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [localUploading, setLocalUploading] = useState(false);
  
  const {
    records,
    currentRecord,
    isLoading,
    isUploading,
    uploadHealthCheckup,
    deleteRecord,
    updateExamDate,
    setCurrentRecord,
  } = useHealthRecords();

  const handleShareToKakao = () => {
    if (!currentRecord?.parsed_data) return;

    const healthAge = currentRecord.health_age;
    const summary = currentRecord.parsed_data.summary || "건강검진 결과가 도착했어요!";

    if (typeof window !== "undefined" && (window as any).Kakao) {
      const Kakao = (window as any).Kakao;
      
      if (!Kakao.isInitialized()) {
        toast.error("카카오 SDK가 초기화되지 않았어요.");
        return;
      }

      Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "건강양갱 - 건강검진 결과",
          description: healthAge 
            ? `건강나이: ${healthAge}세\n${summary.slice(0, 50)}...` 
            : summary.slice(0, 100),
          imageUrl: "https://your-domain.com/og-image.png",
          link: {
            mobileWebUrl: window.location.origin,
            webUrl: window.location.origin,
          },
        },
      });
    } else {
      const shareText = healthAge
        ? `[건강양갱] 건강검진 결과\n건강나이: ${healthAge}세\n${summary}`
        : `[건강양갱] 건강검진 결과\n${summary}`;

      navigator.clipboard.writeText(shareText);
      toast.success("공유 내용이 복사되었어요!");
    }
    setShowShareDialog(false);
  };

  const handleShareCopy = () => {
    if (!currentRecord?.parsed_data) return;

    const healthAge = currentRecord.health_age;
    const summary = currentRecord.parsed_data.summary || "";

    const shareText = healthAge
      ? `[건강양갱] 건강검진 결과\n건강나이: ${healthAge}세\n${summary}`
      : `[건강양갱] 건강검진 결과\n${summary}`;

    navigator.clipboard.writeText(shareText);
    toast.success("공유 내용이 복사되었어요!");
    setShowShareDialog(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (localUploading || isUploading) return; // 중복 업로드 방지

    const fileArray = Array.from(files);
    
    const validFiles = fileArray.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드할 수 있습니다");
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("파일 크기는 10MB 이하여야 합니다");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setLocalUploading(true);
    try {
      await uploadHealthCheckup(validFiles, format(examDate, "yyyy-MM-dd"));
      toast.success("업로드 완료! AI가 분석 중입니다");
      setShowUploadDialog(false);
    } catch (err: any) {
      toast.error("업로드 실패: " + (err?.message || "네트워크 오류"));
    } finally {
      setLocalUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openUploadDialog = () => {
    setExamDate(new Date());
    setShowUploadDialog(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (deletingRecordId) return; // 중복 삭제 방지
    
    setDeletingRecordId(id);
    try {
      await deleteRecord(id);
      toast.success("삭제되었습니다");
      if (records.length > 1) {
        setCurrentRecord(records.find(r => r.id !== id) || null);
      }
    } catch (err: any) {
      toast.error("삭제 실패: " + (err?.message || "네트워크 오류"));
    } finally {
      setDeletingRecordId(null);
    }
  };

  const openEditDate = (record: HealthRecord) => {
    setEditingRecordId(record.id);
    setEditExamDate(record.exam_date ? new Date(record.exam_date) : new Date());
  };

  const saveEditDate = async () => {
    if (!editingRecordId || !editExamDate) return;
    if (isUpdatingDate) return; // 중복 저장 방지
    
    setIsUpdatingDate(true);
    try {
      await updateExamDate(editingRecordId, format(editExamDate, "yyyy-MM-dd"));
      toast.success("검진일이 수정되었습니다");
      setEditingRecordId(null);
    } catch (err: any) {
      toast.error("수정 실패: " + (err?.message || "네트워크 오류"));
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const renderHealthCheckupContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      );
    }

    if (!currentRecord) {
      return (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center">
            <FileText className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            건강검진 결과를 올려주세요
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            검진 결과지를 사진으로 찍으면
            <br />
            AI가 쉽게 분석해드려요.
          </p>

          <Button size="lg" className="h-14 px-8 text-lg" onClick={openUploadDialog}>
            <Upload className="w-5 h-5 mr-2" />
            검진 결과 업로드
          </Button>
        </div>
      );
    }

    const statusLabels = {
      uploading: "업로드 중",
      analyzing: "분석 중",
      pending_review: "검토 대기",
      completed: "완료",
    };

    if (currentRecord.status === "uploading" || currentRecord.status === "analyzing") {
      return (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            AI가 분석 중이에요
          </h2>
          <p className="text-lg text-muted-foreground">1~2분 정도 소요됩니다.</p>
        </div>
      );
    }

    if (currentRecord.status === "pending_review") {
      return (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            코치님이 검토 중이에요
          </h2>
          <p className="text-lg text-muted-foreground mb-4">
            AI 분석이 완료되었어요.
          </p>

          {currentRecord.parsed_data && (
            <div className="mt-6 text-left bg-card rounded-2xl p-5 border border-border">
              <h3 className="font-semibold mb-3">AI 분석 결과 (검토 전)</h3>
              <p className="text-muted-foreground mb-4">{currentRecord.parsed_data.summary}</p>
              <div className="space-y-2">
                {currentRecord.parsed_data.items.slice(0, 3).map((item, idx) => (
                  <HealthItemCard key={idx} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // completed status
    const parsedData = currentRecord.parsed_data;
    const healthAge = currentRecord.health_age;
    const normalItems = parsedData?.items.filter(i => i.status === "normal") || [];
    const warningItems = parsedData?.items.filter(i => i.status === "warning") || [];
    const dangerItems = parsedData?.items.filter(i => i.status === "danger") || [];

    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span className="text-lg font-medium">검진 결과 완료</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {currentRecord.exam_date ? format(new Date(currentRecord.exam_date), "yyyy.MM.dd", { locale: ko }) : ""}
            </span>
          </div>

          {healthAge && (
            <div className="text-center py-6 bg-emerald-50 rounded-2xl mb-4">
              <p className="text-muted-foreground mb-2">건강 나이</p>
              <p className="text-5xl font-bold text-emerald-600 mb-2">{healthAge}세</p>
            </div>
          )}

          {parsedData?.summary && (
            <p className="text-lg text-foreground mb-4">{parsedData.summary}</p>
          )}

          <div className="space-y-4">
            {normalItems.length > 0 && (
              <div>
                <h4 className="font-medium text-emerald-700 mb-2">정상 ({normalItems.length}개)</h4>
                <div className="space-y-2">
                  {normalItems.map((item, idx) => (
                    <HealthItemCard key={idx} item={item} />
                  ))}
                </div>
              </div>
            )}

            {warningItems.length > 0 && (
              <div>
                <h4 className="font-medium text-amber-700 mb-2">주의 ({warningItems.length}개)</h4>
                <div className="space-y-2">
                  {warningItems.map((item, idx) => (
                    <HealthItemCard key={idx} item={item} />
                  ))}
                </div>
              </div>
            )}

            {dangerItems.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">관리 필요 ({dangerItems.length}개)</h4>
                <div className="space-y-2">
                  {dangerItems.map((item, idx) => (
                    <HealthItemCard key={idx} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {currentRecord.coach_comment && (
            <div className="mt-4 p-4 rounded-xl bg-muted">
              <p className="text-sm text-muted-foreground mb-1">💬 코치 코멘트</p>
              <p className="text-foreground">{currentRecord.coach_comment}</p>
            </div>
          )}
        </div>

        <Button size="lg" className="w-full h-12" onClick={() => setShowShareDialog(true)}>
          <Share2 className="w-5 h-5 mr-2" />
          가족에게 공유하기
        </Button>

        <Button variant="outline" size="lg" className="w-full h-12" onClick={openUploadDialog} disabled={isUploading}>
          <Upload className="w-5 h-5 mr-2" />
          새 검진 결과 업로드
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">건강양갱</h1>
        <p className="text-lg text-muted-foreground">
          건강검진과 인바디 결과를 한 눈에
        </p>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="checkup" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="checkup">건강검진</TabsTrigger>
          <TabsTrigger value="inbody">인바디</TabsTrigger>
        </TabsList>

        <TabsContent value="checkup" className="mt-4 space-y-4">
          {/* 메인 콘텐츠 */}
          <div className="bg-card rounded-3xl border border-border p-6">
            {renderHealthCheckupContent()}
          </div>

          {/* 기록 목록 (여러 개) */}
          {records.length > 0 && (
            <div className="bg-card rounded-3xl border border-border p-6">
              <h3 className="font-semibold text-lg mb-4">검진 기록 목록</h3>
              <div className="space-y-2">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className={cn(
                      "p-4 rounded-xl border transition-colors flex items-center justify-between",
                      currentRecord?.id === record.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 cursor-pointer"
                    )}
                    onClick={() => setCurrentRecord(record)}
                  >
                    <div>
                      <p className="font-medium">
                        {record.exam_date 
                          ? format(new Date(record.exam_date), "yyyy년 M월 d일", { locale: ko })
                          : format(new Date(record.created_at), "yyyy년 M월 d일", { locale: ko })
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.status === "completed" ? "분석 완료" : 
                         record.status === "analyzing" ? "분석 중" :
                         record.status === "pending_review" ? "검토 대기" : "업로드 중"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); openEditDate(record); }}
                        disabled={!!deletingRecordId || isUpdatingDate}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => e.stopPropagation()}
                            disabled={deletingRecordId === record.id}
                          >
                            {deletingRecordId === record.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>이 기록과 관련된 이미지도 함께 삭제됩니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteRecord(record.id)}
                              disabled={!!deletingRecordId}
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inbody" className="mt-4">
          <div className="bg-card rounded-3xl border border-border p-6">
            <InBodySection />
          </div>
        </TabsContent>
      </Tabs>

      {/* 업로드 다이얼로그 (검진일 선택) */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>검진 결과 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">검진일 선택</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(examDate, "yyyy년 M월 d일", { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={examDate}
                    onSelect={(date) => date && setExamDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || localUploading}
              >
                {(isUploading || localUploading) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    카메라로 촬영
                  </>
                )}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || localUploading}
              >
                <Upload className="w-5 h-5 mr-2" />
                갤러리에서 선택
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              JPG, PNG 파일 (최대 10MB)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 검진일 수정 다이얼로그 */}
      <Dialog open={!!editingRecordId} onOpenChange={(open) => !open && setEditingRecordId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>검진일 수정</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editExamDate ? format(editExamDate, "yyyy년 M월 d일", { locale: ko }) : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editExamDate}
                  onSelect={setEditExamDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecordId(null)} disabled={isUpdatingDate}>취소</Button>
            <Button onClick={saveEditDate} disabled={isUpdatingDate}>
              {isUpdatingDate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공유 다이얼로그 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>가족에게 공유하기</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 justify-start bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] border-none"
              onClick={handleShareToKakao}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              카카오톡으로 공유
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 justify-start"
              onClick={handleShareCopy}
            >
              <Share2 className="w-5 h-5 mr-3" />
              텍스트 복사하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
