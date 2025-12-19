import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useInBodyRecords } from "@/hooks/useServerSync";
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

const emptyForm: InBodyForm = {
  date: new Date().toISOString().split('T')[0],
  weight: 0,
  skeletal_muscle: null,
  body_fat: null,
  body_fat_percent: null,
  bmr: null,
  visceral_fat: null,
};

// Mock AI 분석 함수 (추후 실제 API로 교체)
const mockAnalyzeInBodyImage = async (imageUrl: string): Promise<Partial<InBodyForm>> => {
  // 실제로는 AI API를 호출해서 이미지에서 데이터 추출
  await new Promise((r) => setTimeout(r, 2000));
  
  // Mock 데이터 반환
  return {
    date: new Date().toISOString().split('T')[0],
    weight: 65 + Math.random() * 10,
    skeletal_muscle: 25 + Math.random() * 5,
    body_fat_percent: 18 + Math.random() * 8,
    bmr: 1400 + Math.floor(Math.random() * 200),
  };
};

export default function InBody() {
  const { toast } = useToast();
  const { data: records, loading, add, update, remove } = useInBodyRecords();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InBodyForm>(emptyForm);
  
  // 사진 분석 관련 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!formData.weight || !formData.date) {
      toast({ title: "체중과 날짜는 필수입니다", variant: "destructive" });
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
  };

  const openNewDialog = () => {
    resetForm();
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
      setDialogOpen(true);

      try {
        const analyzedData = await mockAnalyzeInBodyImage(base64);
        
        // 분석 결과를 폼에 자동 입력
        setFormData(prev => ({
          ...prev,
          date: analyzedData.date || prev.date,
          weight: analyzedData.weight ? parseFloat(analyzedData.weight.toFixed(1)) : prev.weight,
          skeletal_muscle: analyzedData.skeletal_muscle ? parseFloat(analyzedData.skeletal_muscle.toFixed(1)) : prev.skeletal_muscle,
          body_fat_percent: analyzedData.body_fat_percent ? parseFloat(analyzedData.body_fat_percent.toFixed(1)) : prev.body_fat_percent,
          bmr: analyzedData.bmr || prev.bmr,
        }));
        
        toast({ title: "분석 완료!", description: "결과를 확인하고 수정 후 저장하세요." });
      } catch (error) {
        toast({ title: "분석 실패", description: "다시 시도해주세요", variant: "destructive" });
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1" />
              촬영
            </Button>
            <Button onClick={openNewDialog} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              기록
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 사진으로 자동입력 안내 */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/15 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">사진으로 자동 입력</p>
            <p className="text-sm text-muted-foreground">인바디 결과지를 촬영하면 AI가 자동으로 분석합니다</p>
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
            <Button className="mt-4" onClick={openNewDialog}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인바디 수정" : "인바디 기록"}</DialogTitle>
          </DialogHeader>
          
          {/* 분석 중 상태 */}
          {isAnalyzing && (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">AI가 인바디 결과를 분석 중입니다...</p>
            </div>
          )}

          {/* 업로드된 이미지 미리보기 */}
          {uploadedImage && !isAnalyzing && (
            <div className="mb-4">
              <img 
                src={uploadedImage} 
                alt="인바디 사진" 
                className="w-full h-32 object-cover rounded-xl"
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                분석된 결과를 확인하고 수정 후 저장하세요
              </p>
            </div>
          )}

          {!isAnalyzing && (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">날짜 *</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">체중 (kg) *</label>
                    <Input type="number" step="0.1" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">골격근량 (kg)</label>
                    <Input type="number" step="0.1" value={formData.skeletal_muscle || ''} onChange={e => setFormData({ ...formData, skeletal_muscle: parseFloat(e.target.value) || null })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">체지방량 (kg)</label>
                    <Input type="number" step="0.1" value={formData.body_fat || ''} onChange={e => setFormData({ ...formData, body_fat: parseFloat(e.target.value) || null })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">체지방률 (%)</label>
                    <Input type="number" step="0.1" value={formData.body_fat_percent || ''} onChange={e => setFormData({ ...formData, body_fat_percent: parseFloat(e.target.value) || null })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">기초대사량 (kcal)</label>
                    <Input type="number" value={formData.bmr || ''} onChange={e => setFormData({ ...formData, bmr: parseInt(e.target.value) || null })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">내장지방 레벨</label>
                    <Input type="number" value={formData.visceral_fat || ''} onChange={e => setFormData({ ...formData, visceral_fat: parseInt(e.target.value) || null })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                <Button onClick={handleSave}>저장</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}