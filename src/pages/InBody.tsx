import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import {
  getInBodyRecords,
  setInBodyRecords,
  InBodyRecord,
  generateId,
} from "@/lib/localStorage";

const emptyRecord: Omit<InBodyRecord, 'id' | 'createdAt'> = {
  date: new Date().toISOString().split('T')[0],
  weight: 0,
  skeletalMuscle: 0,
  bodyFat: 0,
  bodyFatPercent: 0,
  bmr: 0,
  visceralFat: 0,
};

export default function InBody() {
  const { toast } = useToast();
  const [records, setRecords] = useState<InBodyRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyRecord);

  useEffect(() => {
    const loaded = getInBodyRecords();
    setRecords(loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const handleSave = () => {
    if (!formData.weight || !formData.date) {
      toast({ title: "체중과 날짜는 필수입니다", variant: "destructive" });
      return;
    }

    let updated: InBodyRecord[];
    if (editingId) {
      updated = records.map(r =>
        r.id === editingId ? { ...formData, id: editingId, createdAt: r.createdAt } : r
      );
      toast({ title: "수정되었습니다" });
    } else {
      const newRecord: InBodyRecord = {
        ...formData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      updated = [...records, newRecord];
      toast({ title: "저장되었습니다" });
    }

    updated = updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(updated);
    setInBodyRecords(updated);
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (record: InBodyRecord) => {
    setEditingId(record.id);
    setFormData({
      date: record.date,
      weight: record.weight,
      skeletalMuscle: record.skeletalMuscle,
      bodyFat: record.bodyFat,
      bodyFatPercent: record.bodyFatPercent,
      bmr: record.bmr,
      visceralFat: record.visceralFat,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    setInBodyRecords(updated);
    toast({ title: "삭제되었습니다" });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ ...emptyRecord, date: new Date().toISOString().split('T')[0] });
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getChange = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 0) return { value: `+${diff.toFixed(1)}`, positive: true };
    if (diff < 0) return { value: diff.toFixed(1), positive: false };
    return null;
  };

  const latestRecord = records[0];
  const previousRecord = records[1];

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
            <h1 className="text-xl font-bold">인바디 분석</h1>
          </div>
          <Button onClick={openNewDialog} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            기록
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Latest Summary */}
        {latestRecord ? (
          <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">최근 기록</h2>
              <span className="text-sm text-muted-foreground">{latestRecord.date}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">체중</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.weight}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                  {previousRecord && getChange(latestRecord.weight, previousRecord.weight) && (
                    <span className={`text-sm flex items-center ${getChange(latestRecord.weight, previousRecord.weight)!.positive ? 'text-destructive' : 'text-health-green'}`}>
                      {getChange(latestRecord.weight, previousRecord.weight)!.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {getChange(latestRecord.weight, previousRecord.weight)!.value}
                    </span>
                  )}
                </div>
              </div>

              {/* Skeletal Muscle */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-4 h-4 text-health-blue" />
                  <span className="text-sm text-muted-foreground">골격근량</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.skeletalMuscle}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                  {previousRecord && getChange(latestRecord.skeletalMuscle, previousRecord.skeletalMuscle) && (
                    <span className={`text-sm flex items-center ${getChange(latestRecord.skeletalMuscle, previousRecord.skeletalMuscle)!.positive ? 'text-health-green' : 'text-destructive'}`}>
                      {getChange(latestRecord.skeletalMuscle, previousRecord.skeletalMuscle)!.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {getChange(latestRecord.skeletalMuscle, previousRecord.skeletalMuscle)!.value}
                    </span>
                  )}
                </div>
              </div>

              {/* Body Fat */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-health-orange" />
                  <span className="text-sm text-muted-foreground">체지방량/률</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.bodyFat}</span>
                  <span className="text-sm text-muted-foreground">kg</span>
                  <span className="text-lg text-muted-foreground">({latestRecord.bodyFatPercent}%)</span>
                </div>
              </div>

              {/* BMR */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-sm text-muted-foreground">기초대사량</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{latestRecord.bmr}</span>
                  <span className="text-sm text-muted-foreground">kcal</span>
                </div>
              </div>
            </div>

            {/* Visceral Fat */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">내장지방 레벨</span>
                <span className="text-xl font-bold">{latestRecord.visceralFat}</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${latestRecord.visceralFat <= 9 ? 'bg-health-green' : latestRecord.visceralFat <= 14 ? 'bg-yellow-500' : 'bg-destructive'}`}
                  style={{ width: `${Math.min(latestRecord.visceralFat * 5, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>정상 (1-9)</span>
                <span>주의 (10-14)</span>
                <span>위험 (15+)</span>
              </div>
            </div>
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

        {/* Records List */}
        {records.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">기록 목록</h2>
            <div className="space-y-2">
              {records.map(record => (
                <div
                  key={record.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{record.date}</p>
                    <p className="text-sm text-muted-foreground">
                      체중 {record.weight}kg / 골격근 {record.skeletalMuscle}kg / 체지방 {record.bodyFatPercent}%
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인바디 수정" : "인바디 기록"}</DialogTitle>
          </DialogHeader>
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
                <label className="text-sm font-medium">체중 (kg) *</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">골격근량 (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.skeletalMuscle || ''}
                  onChange={e => setFormData({ ...formData, skeletalMuscle: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">체지방량 (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.bodyFat || ''}
                  onChange={e => setFormData({ ...formData, bodyFat: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">체지방률 (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.bodyFatPercent || ''}
                  onChange={e => setFormData({ ...formData, bodyFatPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">기초대사량 (kcal)</label>
                <Input
                  type="number"
                  value={formData.bmr || ''}
                  onChange={e => setFormData({ ...formData, bmr: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">내장지방 레벨</label>
                <Input
                  type="number"
                  value={formData.visceralFat || ''}
                  onChange={e => setFormData({ ...formData, visceralFat: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
