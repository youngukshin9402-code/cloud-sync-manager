import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInBodyRecords } from "@/hooks/useServerSync";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Dumbbell,
  Flame,
  Activity,
  Loader2,
  Camera,
  Image as ImageIcon,
  Keyboard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface InBodyForm {
  date: string;
  weight: number;
  skeletal_muscle: number | null;
  body_fat: number | null;
  body_fat_percent: number | null;
  bmr: number | null;
  visceral_fat: number | null;
}

interface AIConfidence {
  weight?: number;
  skeletal_muscle?: number;
  body_fat_percent?: number;
  bmr?: number;
}

interface ValidationWarning {
  field: string;
  message: string;
}

const emptyForm: InBodyForm = {
  date: new Date().toISOString().split('T')[0],
  weight: 0,
  skeletal_muscle: null,
  body_fat: null,
  body_fat_percent: null,
  bmr: null,
  visceral_fat: null,
};

// 값 유효성 검증
const validateFormData = (data: InBodyForm): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  
  if (data.weight && (data.weight < 20 || data.weight > 300)) {
    warnings.push({ field: 'weight', message: '체중 범위(20-300kg)를 벗어났습니다' });
  }
  if (data.skeletal_muscle && (data.skeletal_muscle < 5 || data.skeletal_muscle > 80)) {
    warnings.push({ field: 'skeletal_muscle', message: '골격근량 범위(5-80kg)를 벗어났습니다' });
  }
  if (data.body_fat_percent && (data.body_fat_percent < 1 || data.body_fat_percent > 60)) {
    warnings.push({ field: 'body_fat_percent', message: '체지방률 범위(1-60%)를 벗어났습니다' });
  }
  if (data.bmr && (data.bmr < 500 || data.bmr > 4000)) {
    warnings.push({ field: 'bmr', message: '기초대사량 범위(500-4000kcal)를 벗어났습니다' });
  }
  
  return warnings;
};

// AI 분석 함수 - Lovable AI 연동
const analyzeInBodyImage = async (imageBase64: string): Promise<{ data: Partial<InBodyForm>; confidence?: AIConfidence }> => {
  const { data, error } = await supabase.functions.invoke('analyze-inbody', {
    body: { imageBase64 }
  });

  if (error) {
    console.error('AI analysis error:', error);
    throw new Error(error.message || 'AI 분석 실패');
  }

  if (!data.success) {
    throw new Error(data.error || 'AI 분석 실패');
  }

  return { data: data.data, confidence: data.confidence };
};

export default function InBody() {
  const { toast } = useToast();
  const { data: records, loading, add, update, remove } = useInBodyRecords();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InBodyForm>(emptyForm);
  
  // 입력 모드 상태
  const [inputMode, setInputMode] = useState<'manual' | 'photo'>('manual');
  
  // 사진 분석 관련 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<AIConfidence | null>(null);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // 유효성 검증 관련
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);

  const handleSave = async () => {
    if (!formData.weight || !formData.date) {
      toast({ title: "체중과 날짜는 필수입니다", variant: "destructive" });
      return;
    }

    // 유효성 검증
    const warnings = validateFormData(formData);
    if (warnings.length > 0 && !showWarningConfirm) {
      setValidationWarnings(warnings);
      setShowWarningConfirm(true);
      return;
    }

    if (editingId) {
      const result = await update(editingId, formData);
      if (result.error) {
        toast({ title: "수정 실패", variant: "destructive" });
      } else {
        toast({ title: "수정되었습니다" });
      }
    } else {
      const result = await add(formData);
      if (result.error) {
        toast({ title: "저장 실패", variant: "destructive" });
      } else {
        toast({ title: "저장되었습니다" });
      }
    }
    setDialogOpen(false);
    resetForm();
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
    setInputMode('manual');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await remove(id);
    if (result.error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    } else {
      toast({ title: "삭제되었습니다" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, date: new Date().toISOString().split('T')[0] });
    setUploadedImage(null);
    setIsAnalyzing(false);
    setAiConfidence(null);
    setAiPrefilled(false);
    setValidationWarnings([]);
    setShowWarningConfirm(false);
  };

  const openNewDialog = (mode: 'manual' | 'photo' = 'manual') => {
    resetForm();
    setInputMode(mode);
    setDialogOpen(true);
  };

  // 사진 선택 처리
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      setIsAnalyzing(true);
      setInputMode('photo');
      setDialogOpen(true);

      try {
        const result = await analyzeInBodyImage(base64);
        const analyzedData = result.data;
        
        // 분석 결과를 폼에 자동 입력
        setFormData(prev => ({
          ...prev,
          date: analyzedData.date || prev.date,
          weight: analyzedData.weight ? parseFloat(Number(analyzedData.weight).toFixed(1)) : prev.weight,
          skeletal_muscle: analyzedData.skeletal_muscle ? parseFloat(Number(analyzedData.skeletal_muscle).toFixed(1)) : prev.skeletal_muscle,
          body_fat_percent: analyzedData.body_fat_percent ? parseFloat(Number(analyzedData.body_fat_percent).toFixed(1)) : prev.body_fat_percent,
          body_fat: analyzedData.body_fat ? parseFloat(Number(analyzedData.body_fat).toFixed(1)) : prev.body_fat,
          bmr: analyzedData.bmr || prev.bmr,
          visceral_fat: analyzedData.visceral_fat || prev.visceral_fat,
        }));
        
        setAiConfidence(result.confidence || null);
        setAiPrefilled(true);
        
        toast({ title: "분석 완료!", description: "AI가 인바디 결과를 인식했습니다. 확인 후 저장하세요." });
      } catch (error) {
        console.error('Analysis error:', error);
        toast({ 
          title: "분석 실패", 
          description: "수기 입력으로 전환합니다", 
          variant: "destructive" 
        });
        setUploadedImage(null);
        setInputMode('manual');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getChange = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 0) return { value: `+${diff.toFixed(1)}`, positive: true };
    if (diff < 0) return { value: diff.toFixed(1), positive: false };
    return null;
  };

  const hasFieldWarning = (fieldName: string) => {
    return validationWarnings.some(w => w.field === fieldName);
  };

  const latestRecord = records[0];
  const previousRecord = records[1];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageSelect}
      />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
      />

      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/medical">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">인바디 분석</h1>
          </div>
          <Button onClick={() => openNewDialog('manual')} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            기록
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 입력 방식 선택 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => openNewDialog('manual')}
            className="bg-card rounded-2xl border border-border p-4 flex flex-col items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Keyboard className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">수기 입력</p>
              <p className="text-xs text-muted-foreground">직접 데이터 입력</p>
            </div>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 flex flex-col items-center gap-3 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">사진 AI 분석</p>
              <p className="text-xs text-muted-foreground">결과지 촬영/업로드</p>
            </div>
          </div>
        </div>

        {latestRecord ? (
          <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">최근 기록</h2>
              <span className="text-sm text-muted-foreground">{latestRecord.date}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">체중</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{Number(latestRecord.weight).toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                  {previousRecord && getChange(Number(latestRecord.weight), Number(previousRecord.weight)) && (
                    <span className={`text-sm flex items-center ${getChange(Number(latestRecord.weight), Number(previousRecord.weight))!.positive ? 'text-destructive' : 'text-health-green'}`}>
                      {getChange(Number(latestRecord.weight), Number(previousRecord.weight))!.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {getChange(Number(latestRecord.weight), Number(previousRecord.weight))!.value}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-4 h-4 text-health-blue" />
                  <span className="text-sm text-muted-foreground">골격근량</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.skeletal_muscle ? Number(latestRecord.skeletal_muscle).toFixed(1) : '-'}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-health-orange" />
                  <span className="text-sm text-muted-foreground">체지방량/률</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.body_fat ? Number(latestRecord.body_fat).toFixed(1) : '-'}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                  <span className="text-lg text-muted-foreground">({latestRecord.body_fat_percent ? Number(latestRecord.body_fat_percent).toFixed(1) : '-'}%)</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-sm text-muted-foreground">기초대사량</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.bmr || '-'}</span>
                  <span className="text-sm text-muted-foreground">kcal</span>
                </div>
              </div>
            </div>

            {latestRecord.visceral_fat !== null && (
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">내장지방 레벨</span>
                  <span className="text-xl font-bold">{latestRecord.visceral_fat}</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${latestRecord.visceral_fat <= 9 ? 'bg-health-green' : latestRecord.visceral_fat <= 14 ? 'bg-yellow-500' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(latestRecord.visceral_fat * 5, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>정상 (1-9)</span>
                  <span>주의 (10-14)</span>
                  <span>위험 (15+)</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border p-8 text-center">
            <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">인바디 기록이 없습니다</p>
            <Button className="mt-4" onClick={() => openNewDialog('manual')}>
              <Plus className="w-4 h-4 mr-1" />
              첫 기록 추가
            </Button>
          </div>
        )}

        {records.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">기록 목록</h2>
            <div className="space-y-2">
              {records.map(record => (
                <div key={record.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{record.date}</p>
                    <p className="text-sm text-muted-foreground">
                      체중 {Number(record.weight).toFixed(1)}kg / 골격근 {record.skeletal_muscle ? Number(record.skeletal_muscle).toFixed(1) : '-'}kg / 체지방 {record.body_fat_percent ? Number(record.body_fat_percent).toFixed(1) : '-'}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>기록을 삭제하시겠습니까?</AlertDialogTitle>
                          <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(record.id)}>삭제</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 입력 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인바디 수정" : "인바디 수기 입력"}</DialogTitle>
          </DialogHeader>
          
          {/* 수기 입력 모드에서는 탭 없이 바로 폼 표시 - 사진 AI는 외부 카드에서 진입 */}
          
          {/* 분석 중 상태 */}
          {isAnalyzing && (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">AI가 인바디 결과를 분석 중입니다...</p>
              <p className="text-xs text-muted-foreground mt-2">잠시만 기다려주세요</p>
            </div>
          )}

          {/* 분석 중 상태 - 외부에서 사진 AI로 진입한 경우만 */}
          {isAnalyzing && (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">AI가 인바디 결과를 분석 중입니다...</p>
              <p className="text-xs text-muted-foreground mt-2">잠시만 기다려주세요</p>
            </div>
          )}

          {/* 업로드된 이미지 미리보기 + AI 결과 표시 (외부에서 사진 AI로 진입한 경우) */}
          {uploadedImage && !isAnalyzing && (
            <div className="space-y-3">
              <img 
                src={uploadedImage} 
                alt="인바디 사진" 
                className="w-full h-32 object-cover rounded-xl"
              />
              {aiPrefilled && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-xs text-foreground">
                    AI 분석 완료 - 결과를 확인하고 필요시 수정하세요
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 폼 필드들 - 수기 입력 또는 AI 분석 후 */}
          {!isAnalyzing && (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">날짜 *</label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">체중 (kg) *</label>
                      {hasFieldWarning('weight') && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          <AlertTriangle className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={formData.weight || ''} 
                      onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      className={hasFieldWarning('weight') ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">골격근량 (kg)</label>
                      {hasFieldWarning('skeletal_muscle') && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          <AlertTriangle className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={formData.skeletal_muscle ?? ''} 
                      onChange={e => setFormData({ ...formData, skeletal_muscle: e.target.value ? parseFloat(e.target.value) : null })}
                      className={hasFieldWarning('skeletal_muscle') ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">체지방률 (%)</label>
                      {hasFieldWarning('body_fat_percent') && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          <AlertTriangle className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={formData.body_fat_percent ?? ''} 
                      onChange={e => setFormData({ ...formData, body_fat_percent: e.target.value ? parseFloat(e.target.value) : null })}
                      className={hasFieldWarning('body_fat_percent') ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">기초대사량 (kcal)</label>
                      {hasFieldWarning('bmr') && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          <AlertTriangle className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    <Input 
                      type="number" 
                      value={formData.bmr ?? ''} 
                      onChange={e => setFormData({ ...formData, bmr: e.target.value ? parseInt(e.target.value) : null })}
                      className={hasFieldWarning('bmr') ? 'border-destructive' : ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">체지방량 (kg)</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={formData.body_fat ?? ''} 
                      onChange={e => setFormData({ ...formData, body_fat: e.target.value ? parseFloat(e.target.value) : null })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">내장지방 레벨</label>
                    <Input 
                      type="number"
                      value={formData.visceral_fat ?? ''} 
                      onChange={e => setFormData({ ...formData, visceral_fat: e.target.value ? parseInt(e.target.value) : null })} 
                    />
                  </div>
                </div>
              </div>

              {/* 유효성 경고 표시 */}
              {validationWarnings.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>비정상 값이 감지되었습니다</span>
                  </div>
                  {validationWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-destructive/80 ml-6">{w.message}</p>
                  ))}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                {showWarningConfirm ? (
                  <>
                    <Button variant="outline" onClick={() => {
                      setShowWarningConfirm(false);
                      setValidationWarnings([]);
                    }}>
                      수정하기
                    </Button>
                    <Button onClick={handleSave}>
                      그대로 저장
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleSave} className="w-full" disabled={isAnalyzing}>
                    {editingId ? "수정" : "저장"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
