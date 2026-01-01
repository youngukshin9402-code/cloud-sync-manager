import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  Keyboard,
  ImageIcon,
  TrendingUp,
  Brain,
  Download,
} from "lucide-react";
import { useHealthRecords, HealthRecord, HealthRecordItem } from "@/hooks/useHealthRecords";
import { useInBodyRecords } from "@/hooks/useServerSync";
import { useHealthAge } from "@/contexts/HealthAgeContext";
import { supabase } from "@/integrations/supabase/client";
import { computeHealthAge, Gender as HealthAgeGender } from "@/utils/healthAge";
import html2canvas from "html2canvas";
import HealthShareCard from "@/components/health/HealthShareCard";
import { PageHeader } from "@/components/layout/PageHeader";

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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  const { healthAgeData, saveHealthAge, clearHealthAge, loading: healthAgeLoading } = useHealthAge();
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
    visceral_fat_area: null as number | null,
  });

  // 사진 AI 분석 관련 상태
  const [inputMode, setInputMode] = useState<'manual' | 'photo'>('manual');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // AI 건강 나이/신체 점수 분석 상태 - localStorage에서 복원
  const [healthAgeResult, setHealthAgeResult] = useState<{
    actualAge: number;
    healthAge: number;
    bodyScore: number;
    analysis: string;
  } | null>(null);
  const [isAnalyzingHealth, setIsAnalyzingHealth] = useState(false);
  const [actualAgeInput, setActualAgeInput] = useState<number | null>(null);
  const [genderInput, setGenderInput] = useState<HealthAgeGender | null>(null);
  const [showAgeInputDialog, setShowAgeInputDialog] = useState(false);

  // DB 전역 상태에서 건강나이 결과 복원 (localStorage 불필요)
  useEffect(() => {
    if (healthAgeData) {
      setHealthAgeResult({
        actualAge: healthAgeData.actualAge,
        healthAge: healthAgeData.healthAge,
        bodyScore: healthAgeData.bodyScore ?? 0,
        analysis: healthAgeData.analysis ?? '',
      });
    } else {
      setHealthAgeResult(null);
    }
  }, [healthAgeData]);

  // 트렌드 차트 데이터
  const chartData = useMemo(() => {
    if (records.length < 2) return [];
    
    return [...records]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
      .map(r => ({
        date: r.date.slice(5), // MM-DD 형식
        체중: r.weight ? Number(r.weight) : null,
        골격근: r.skeletal_muscle ? Number(r.skeletal_muscle) : null,
        체지방률: r.body_fat_percent ? Number(r.body_fat_percent) : null,
      }));
  }, [records]);

  // AI 분석 함수
  const analyzeInBodyImage = async (imageBase64: string) => {
    const { data, error } = await supabase.functions.invoke('analyze-inbody', {
      body: { imageBase64 }
    });

    if (error) throw new Error(error.message || 'AI 분석 실패');
    if (!data.success) {
      // 인바디 결과지가 아닌 경우 특별 처리
      if (data.error?.includes('인바디') || data.error?.includes('결과지')) {
        throw new Error('인바디 결과지 사진이 아닙니다. 올바른 인바디 결과지를 촬영해주세요.');
      }
      throw new Error(data.error || 'AI 분석 실패');
    }
    return data.data;
  };

  // VFA에서 내장지방 레벨로 환산 (VFA / 10 후 올림)
  const convertVfaToLevel = (vfa: number): number => {
    return Math.ceil(vfa / 10);
  };

  // AI 건강 나이/신체 점수 분석 함수 - 실제 나이 입력 후 분석
  const startHealthAgeAnalysis = (record: typeof records[0]) => {
    setShowAgeInputDialog(true);
  };

  const analyzeHealthAge = async (record: typeof records[0], actualAge: number, gender: HealthAgeGender) => {
    if (isAnalyzingHealth) return;
    setIsAnalyzingHealth(true);
    setHealthAgeResult(null);
    setShowAgeInputDialog(false);

    try {
      // 필수 데이터 검증
      const bodyFatPercent = record.body_fat_percent ? Number(record.body_fat_percent) : null;
      
      // 내장지방 레벨 결정: 레벨 우선, 없으면 VFA에서 환산
      let visceralFatLevel: number | null = null;
      if (record.visceral_fat !== null && record.visceral_fat !== undefined) {
        // 내장지방 레벨이 있으면 그대로 사용
        visceralFatLevel = record.visceral_fat;
      } else if ((record as any).visceral_fat_area !== null && (record as any).visceral_fat_area !== undefined) {
        // VFA만 있으면 환산: ceil(VFA / 10)
        visceralFatLevel = convertVfaToLevel((record as any).visceral_fat_area);
      }
      
      // 둘 다 없으면 분석 불가
      if (visceralFatLevel === null) {
        toast.error("내장지방 레벨 혹은 내장지방 단면적(VFA) 기록이 필요합니다.");
        setIsAnalyzingHealth(false);
        return;
      }
      
      if (bodyFatPercent === null) {
        throw new Error("체지방률이 필요합니다");
      }

      // computeHealthAge로 결정론적 건강 나이 계산
      const healthAgeInput = {
        actualAge,
        gender,
        bodyFatPercent,
        visceralFatLevel: visceralFatLevel,
        weightKg: Number(record.weight),
        smmKg: record.skeletal_muscle ? Number(record.skeletal_muscle) : undefined,
      };
      
      const computedResult = computeHealthAge(healthAgeInput);
      
      // AI로 설명 텍스트만 생성 (temperature=0 사용)
      const { data, error } = await supabase.functions.invoke('analyze-inbody', {
        body: { 
          generateAnalysisText: true,
          actualAge,
          gender,
          healthAge: computedResult.healthAge,
          isAthletic: computedResult.isAthletic,
          debug: computedResult.debug,
          inbodyData: {
            weight: Number(record.weight),
            skeletal_muscle: record.skeletal_muscle ? Number(record.skeletal_muscle) : null,
            body_fat_percent: bodyFatPercent,
            body_fat: record.body_fat ? Number(record.body_fat) : null,
            bmr: record.bmr,
            visceral_fat: visceralFatLevel,
            date: record.date,
          }
        }
      });

      if (error) throw new Error(error.message || 'AI 분석 실패');
      
      // 신체 점수는 athleticScore 기반으로 계산 (0~100)
      const bodyScore = Math.round(computedResult.debug.athleticScore * 100);

      const result = {
        actualAge,
        healthAge: computedResult.healthAge,
        bodyScore,
        analysis: data?.analysis || `실제 나이 ${actualAge}세 대비 건강 나이는 ${computedResult.healthAge}세입니다.`,
      };
      setHealthAgeResult(result);
      // DB에 결과 저장 (전역 상태도 자동 업데이트됨)
      await saveHealthAge({
        ...result,
        inbodyRecordDate: record.date,
          inbodyData: {
            weight: Number(record.weight),
            skeletal_muscle: record.skeletal_muscle ? Number(record.skeletal_muscle) : null,
            body_fat_percent: bodyFatPercent,
            body_fat: record.body_fat ? Number(record.body_fat) : null,
            bmr: record.bmr,
            visceral_fat: visceralFatLevel,
          },
      });
      toast.success("건강 나이 분석 완료!");
    } catch (error) {
      console.error('Health age analysis error:', error);
      toast.error(error instanceof Error ? error.message : "분석 실패 - 잠시 후 다시 시도해주세요");
    } finally {
      setIsAnalyzingHealth(false);
    }
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
        const analyzedData = await analyzeInBodyImage(base64);
        
        setFormData(prev => ({
          ...prev,
          date: analyzedData.date || prev.date,
          weight: analyzedData.weight ? parseFloat(Number(analyzedData.weight).toFixed(1)) : prev.weight,
          skeletal_muscle: analyzedData.skeletal_muscle ? parseFloat(Number(analyzedData.skeletal_muscle).toFixed(1)) : prev.skeletal_muscle,
          body_fat_percent: analyzedData.body_fat_percent ? parseFloat(Number(analyzedData.body_fat_percent).toFixed(1)) : prev.body_fat_percent,
          body_fat: analyzedData.body_fat ? parseFloat(Number(analyzedData.body_fat).toFixed(1)) : prev.body_fat,
          bmr: analyzedData.bmr || prev.bmr,
          visceral_fat: analyzedData.visceral_fat || prev.visceral_fat,
          visceral_fat_area: analyzedData.visceral_fat_area ? parseFloat(Number(analyzedData.visceral_fat_area).toFixed(1)) : prev.visceral_fat_area,
        }));
        
        setAiPrefilled(true);
        toast.success("분석 완료! 결과를 확인 후 저장하세요");
      } catch (error: any) {
        console.error('Analysis error:', error);
        const errorMessage = error?.message || "분석 실패";
        toast.error(errorMessage);
        setUploadedImage(null);
        setInputMode('manual');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.weight || !formData.date) {
      toast.error("체중과 날짜는 필수입니다");
      return;
    }
    if (isSaving) return;

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
      visceral_fat_area: (record as any).visceral_fat_area ?? null,
    });
    setInputMode('manual');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    
    setDeletingId(id);
    try {
      const result = await remove(id);
      if (result.error) {
        toast.error("삭제 실패: " + (result.error.message || "네트워크 오류"));
      } else {
        toast.success("삭제되었습니다");
        // 삭제 후 기록이 하나도 없으면 건강나이 결과도 함께 초기화 (홈 탭과 실시간 동기화)
        // records 배열에서 현재 삭제한 id를 제외하고 남은 기록 수 확인
        const remainingRecords = records.filter(r => r.id !== id);
        if (remainingRecords.length === 0) {
          clearHealthAge();
          setHealthAgeResult(null);
        }
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
      visceral_fat_area: null,
    });
    setUploadedImage(null);
    setAiPrefilled(false);
    setInputMode('manual');
  };

  const openNewDialog = (mode: 'manual' | 'photo') => {
    resetForm();
    setInputMode(mode);
    setDialogOpen(true);
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

      {/* 입력 방식 선택 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => openNewDialog('manual')}
        >
          <Keyboard className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm font-medium">수기 입력</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-primary/30 bg-primary/5"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="w-6 h-6 text-primary" />
          <span className="text-sm font-medium text-primary">사진 AI 분석</span>
        </Button>
      </div>

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

          {/* AI 건강 나이 분석 버튼 */}
          <Button
            variant="outline"
            className="w-full h-12 border-primary/30 bg-primary/5"
            onClick={() => startHealthAgeAnalysis(latestRecord)}
            disabled={isAnalyzingHealth}
          >
            {isAnalyzingHealth ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2 text-primary" />
                AI 건강 나이 분석
              </>
            )}
          </Button>

          {/* 실제 나이/성별 입력 다이얼로그 */}
          <Dialog open={showAgeInputDialog} onOpenChange={(open) => {
            setShowAgeInputDialog(open);
            if (!open) {
              setActualAgeInput(null);
              setGenderInput(null);
            }
          }}>
            <DialogContent className="max-w-xs">
              <DialogHeader>
                <DialogTitle>건강나이 분석 정보</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">실제 나이 (필수)</label>
                  <Input
                    type="number"
                    placeholder="예: 35"
                    value={actualAgeInput ?? ''}
                    onChange={(e) => setActualAgeInput(e.target.value ? parseInt(e.target.value) : null)}
                    className="text-center text-lg"
                    min={10}
                    max={99}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">성별 (필수)</label>
                  <RadioGroup 
                    value={genderInput || ''} 
                    onValueChange={(value) => setGenderInput(value as HealthAgeGender)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male">남성</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female">여성</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (actualAgeInput && actualAgeInput >= 10 && actualAgeInput <= 99 && genderInput && latestRecord) {
                      analyzeHealthAge(latestRecord, actualAgeInput, genderInput);
                    } else if (!actualAgeInput || actualAgeInput < 10 || actualAgeInput > 99) {
                      toast.error("나이를 10~99 사이로 입력해주세요");
                    } else if (!genderInput) {
                      toast.error("성별을 선택해주세요");
                    }
                  }}
                  className="w-full"
                  disabled={!actualAgeInput || actualAgeInput < 10 || actualAgeInput > 99 || !genderInput}
                >
                  분석 시작
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AI 분석 결과 */}
          {healthAgeResult && (
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center text-center py-3 px-2 bg-background/30 rounded-xl">
                  {/* Row 1: Label */}
                  <p className="text-xs text-muted-foreground mb-1 h-4">실제 나이</p>
                  {/* Row 2: Number */}
                  <p className="text-2xl font-bold text-foreground h-8 flex items-center">{healthAgeResult.actualAge}세</p>
                  {/* Row 3: Subtext placeholder */}
                  <p className="text-xs mt-0.5 h-4 invisible">placeholder</p>
                </div>
                <div className="flex flex-col items-center text-center py-3 px-2 bg-background/30 rounded-xl">
                  {/* Row 1: Label */}
                  <p className="text-xs text-muted-foreground mb-1 h-4">건강 나이</p>
                  {/* Row 2: Number */}
                  <p className={`text-2xl font-bold h-8 flex items-center ${healthAgeResult.healthAge <= healthAgeResult.actualAge ? 'text-health-green' : 'text-destructive'}`}>
                    {healthAgeResult.healthAge}세
                  </p>
                  {/* Row 3: Subtext */}
                  <p className={`text-xs mt-0.5 h-4 ${healthAgeResult.healthAge <= healthAgeResult.actualAge ? 'text-health-green' : 'text-destructive'}`}>
                    {healthAgeResult.healthAge < healthAgeResult.actualAge 
                      ? `${healthAgeResult.actualAge - healthAgeResult.healthAge}세 젊음`
                      : healthAgeResult.healthAge > healthAgeResult.actualAge
                      ? `${healthAgeResult.healthAge - healthAgeResult.actualAge}세 더 높음`
                      : '실제 나이와 동일'}
                  </p>
                </div>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <div className="space-y-2">
                  {healthAgeResult.analysis.split('\n').filter(line => line.trim()).slice(0, 3).map((line, index) => (
                    <p key={index} className="text-base font-semibold text-foreground leading-snug">
                      {line.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">인바디 기록이 없습니다</p>
        </div>
      )}

      {/* 인바디 트렌드 차트 */}
      {chartData.length >= 2 && (
        <div className="bg-card rounded-2xl border border-border px-2 py-4 space-y-3">
          <div className="flex items-center gap-2 px-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">인바디 트렌드</h3>
          </div>
          <div className="h-[280px] w-full -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="체중" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="골격근" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="체지방률" 
                  stroke="#F97316" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인바디 수정" : "인바디 기록"}</DialogTitle>
          </DialogHeader>

          {/* 수기 입력 모드에서는 탭 제거 - 사진 AI는 외부 버튼으로 진입 */}

          {/* 분석 중 로딩 */}
          {isAnalyzing && (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">AI가 인바디 결과를 분석 중입니다...</p>
            </div>
          )}

          {/* 사진 모드 - 업로드 영역 */}
          {inputMode === 'photo' && !uploadedImage && !isAnalyzing && (
            <div className="py-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">인바디 결과지 업로드</p>
                <p className="text-sm text-muted-foreground">클릭하여 선택</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" className="flex-1" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" />
                  카메라
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-1" />
                  갤러리
                </Button>
              </div>
            </div>
          )}

          {/* 업로드된 이미지 미리보기 */}
          {uploadedImage && !isAnalyzing && (
            <div className="space-y-2">
              <img src={uploadedImage} alt="인바디" className="w-full h-28 object-cover rounded-xl" />
              {aiPrefilled && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-xs">AI 분석 완료 - 확인 후 저장하세요</p>
                </div>
              )}
            </div>
          )}

          {/* 폼 필드들 */}
          {!isAnalyzing && (inputMode === 'manual' || uploadedImage) && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">날짜 *</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">체중 (kg) *</label>
                  <Input type="number" step="0.1" placeholder="65.0" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">골격근량 (kg)</label>
                  <Input type="number" step="0.1" placeholder="28.0" value={formData.skeletal_muscle ?? ''} onChange={e => setFormData({ ...formData, skeletal_muscle: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">체지방률 (%)</label>
                  <Input type="number" step="0.1" placeholder="18.5" value={formData.body_fat_percent ?? ''} onChange={e => setFormData({ ...formData, body_fat_percent: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">기초대사량</label>
                  <Input type="number" placeholder="1450" value={formData.bmr ?? ''} onChange={e => setFormData({ ...formData, bmr: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">내장지방 레벨</label>
                  <Input type="number" placeholder="8" min="1" max="20" value={formData.visceral_fat ?? ''} onChange={e => setFormData({ ...formData, visceral_fat: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">내장지방 단면적(VFA)</label>
                  <Input type="number" step="0.1" placeholder="34.1" value={formData.visceral_fat_area ?? ''} onChange={e => setFormData({ ...formData, visceral_fat_area: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
              </div>
            </div>
          )}

          {!isAnalyzing && (inputMode === 'manual' || uploadedImage) && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>취소</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                저장
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Medical() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editExamDate, setEditExamDate] = useState<Date | undefined>(undefined);
  
  // 로컬 로딩 상태 (Hook 수정 없이 UI에서 처리)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [localUploading, setLocalUploading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [signedImageUrls, setSignedImageUrls] = useState<string[]>([]);
  
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

  // 모든 모달/다이얼로그/로컬 상태 초기화 유틸
  const resetAllDialogStates = useCallback(() => {
    setShowShareDialog(false);
    setShowUploadDialog(false);
    setEditingRecordId(null);
    setEditExamDate(undefined);
    setSignedImageUrls([]);
    setIsGeneratingImage(false);
  }, []);

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

  // 이미지 서명 URL 가져오기
  const fetchSignedImageUrls = useCallback(async () => {
    if (!currentRecord?.raw_image_urls || currentRecord.raw_image_urls.length === 0) {
      setSignedImageUrls([]);
      return;
    }

    try {
      const urls = await Promise.all(
        currentRecord.raw_image_urls.slice(0, 1).map(async (url) => {
          const path = url.replace(/^.*health-checkups\//, "");
          const { data } = await supabase.storage
            .from("health-checkups")
            .createSignedUrl(path, 60 * 10); // 10분
          return data?.signedUrl || "";
        })
      );
      setSignedImageUrls(urls.filter(Boolean));
    } catch (error) {
      console.error("Error fetching signed URLs:", error);
      setSignedImageUrls([]);
    }
  }, [currentRecord?.raw_image_urls]);

  // 이미지로 저장하기 (hidden 캡처용 ref 사용)
  const handleDownloadImage = async () => {
    if (!currentRecord?.parsed_data) return;
    
    setIsGeneratingImage(true);
    
    try {
      // 먼저 서명된 URL 가져오기
      await fetchSignedImageUrls();
      
      // DOM이 업데이트될 시간을 줌
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 폰트 로딩 대기
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      
      // exportCardRef가 준비될 때까지 대기
      if (!exportCardRef.current) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (!exportCardRef.current) {
        throw new Error("Export card not ready");
      }
      
      const exportEl = exportCardRef.current;
      
      // 이미지 로딩 대기
      const images = exportEl.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
      
      const canvas = await html2canvas(exportEl, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        height: exportEl.scrollHeight,
        windowHeight: exportEl.scrollHeight,
      });
      
      const link = document.createElement("a");
      link.download = `건강검진결과_${format(new Date(), "yyyyMMdd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("이미지가 저장되었습니다!");
      setShowShareDialog(false);
    } catch (error) {
      console.error("Image generation error:", error);
      toast.error("이미지 생성에 실패했습니다");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 다이얼로그 열릴 때 서명된 이미지 URL 가져오기
  useEffect(() => {
    if (showShareDialog && currentRecord) {
      fetchSignedImageUrls();
    }
  }, [showShareDialog, currentRecord, fetchSignedImageUrls]);

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
    
    // 모든 관련 모달/다이얼로그 상태 초기화
    resetAllDialogStates();
    
    try {
      // deleteRecord가 이미 optimistic update와 currentRecord 전환을 처리함
      const success = await deleteRecord(id);
      if (!success) {
        // deleteRecord 내부에서 이미 에러 토스트 출력됨
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
          <h2 className="text-2xl font-semibold text-foreground mb-2 whitespace-nowrap">
            건강검진 결과를 올려주세요
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            검진 결과지를 사진으로 찍으면
            <br />
            AI가 쉽게 분석해드려요.
          </p>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="h-14 px-8 text-lg" onClick={openUploadDialog}>
              <Upload className="w-5 h-5 mr-2" />
              검진 결과 업로드
            </Button>
          </div>
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
      const parsedData = currentRecord.parsed_data;
      const healthScore = parsedData?.health_score;
      const scoreReason = parsedData?.score_reason;
      const keyIssues = parsedData?.key_issues || [];
      const actionItems = parsedData?.action_items || [];
      
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              코치님이 검토 중이에요
            </h2>
            <p className="text-muted-foreground">AI 분석이 완료되었어요</p>
          </div>

          {parsedData && (
            <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
              {/* 주의 항목 */}
              {keyIssues.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-red-600 mb-2">⚠️ 주요 문제</h4>
                  <ul className="space-y-1">
                    {keyIssues.slice(0, 3).map((issue: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 권장 행동 */}
              {actionItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-emerald-600 mb-2">✅ 권장 행동</h4>
                  <ul className="space-y-1">
                    {actionItems.slice(0, 3).map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* parsed_data가 있으면 이미지 저장 버튼 노출 */}
          {parsedData && (
            <Button size="lg" className="w-full h-12" onClick={() => setShowShareDialog(true)}>
              <Share2 className="w-5 h-5 mr-2" />
              이미지로 저장하기
            </Button>
          )}

          <Button variant="outline" size="lg" className="w-full h-12" onClick={openUploadDialog} disabled={isUploading}>
            <Upload className="w-5 h-5 mr-2" />
            새 검진 결과 업로드
          </Button>
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

          {/* 코치 코멘트 - 상단으로 이동 */}
          <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-primary mb-1">💬 코치 코멘트</p>
            <p className="text-foreground">
              {currentRecord.coach_comment || "코치 코멘트: 없음"}
            </p>
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
          </div>
        </div>

        <Button size="lg" className="w-full h-12" onClick={() => setShowShareDialog(true)}>
          <Share2 className="w-5 h-5 mr-2" />
          이미지로 저장하기
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
      {/* 헤더 - 공용 컴포넌트 사용 */}
      <PageHeader 
        title="건강양갱" 
        subtitle="건강검진과 인바디 결과를 한 눈에" 
      />

      {/* 탭 */}
      <Tabs defaultValue="checkup" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="checkup">건강검진</TabsTrigger>
          <TabsTrigger value="inbody" className="whitespace-nowrap text-sm">인바디 및 건강나이</TabsTrigger>
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
                {records.map((record) => {
                  // 현재 records 배열에서 찾은 최신 record 사용
                  const handleSelectRecord = () => {
                    const latestRecord = records.find(r => r.id === record.id);
                    if (latestRecord) {
                      setCurrentRecord(latestRecord);
                    }
                  };
                  
                  return (
                  <div
                    key={record.id}
                    className={cn(
                      "p-4 rounded-xl border transition-colors flex items-center justify-between",
                      currentRecord?.id === record.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 cursor-pointer"
                    )}
                    onClick={handleSelectRecord}
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
                  );
                })}

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

      {/* 이미지 저장 다이얼로그 - 모바일 중앙 정렬 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="w-[92vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>건강검진 결과 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground text-center">
              미리보기를 확인하고 이미지로 저장하세요
            </p>
            
            {/* 공유 카드 미리보기 - 중앙 정렬 + 스크롤 */}
            <div className="max-h-[50vh] overflow-y-auto border rounded-lg flex justify-center p-2">
              {currentRecord && (
                <HealthShareCard 
                  ref={shareCardRef} 
                  record={currentRecord} 
                  imageUrls={signedImageUrls}
                />
              )}
            </div>
            
            <Button
              size="lg"
              className="w-full h-14"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  이미지 생성 중...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-3" />
                  이미지로 저장하기
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 캡처용 Hidden HealthShareCard (overflow 없이 전체 높이) */}
      {showShareDialog && currentRecord && (
        <div className="fixed left-[-9999px] top-0 bg-white">
          <HealthShareCard
            ref={exportCardRef}
            record={currentRecord}
            imageUrls={signedImageUrls}
          />
        </div>
      )}

    </div>
  );
}
