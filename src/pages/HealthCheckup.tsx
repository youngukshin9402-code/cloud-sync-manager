import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Heart,
  Activity,
  Droplets,
  FileText,
} from "lucide-react";
import {
  getHealthCheckupRecords,
  setHealthCheckupRecords,
  HealthCheckupRecord,
  generateId,
  getTodayString,
} from "@/lib/localStorage";

const emptyRecord: Omit<HealthCheckupRecord, 'id' | 'createdAt'> = {
  date: getTodayString(),
  bloodSugar: undefined,
  hba1c: undefined,
  cholesterol: undefined,
  triglyceride: undefined,
  ast: undefined,
  alt: undefined,
  creatinine: undefined,
  systolicBP: undefined,
  diastolicBP: undefined,
};

// Mock analysis rules
const analyzeValue = (key: string, value: number | undefined): 'normal' | 'warning' | 'danger' | null => {
  if (value === undefined) return null;
  
  const rules: Record<string, { normal: [number, number]; warning: [number, number] }> = {
    bloodSugar: { normal: [70, 100], warning: [100, 126] },
    hba1c: { normal: [0, 5.7], warning: [5.7, 6.5] },
    cholesterol: { normal: [0, 200], warning: [200, 240] },
    triglyceride: { normal: [0, 150], warning: [150, 200] },
    ast: { normal: [0, 40], warning: [40, 80] },
    alt: { normal: [0, 40], warning: [40, 80] },
    creatinine: { normal: [0.7, 1.3], warning: [1.3, 2.0] },
    systolicBP: { normal: [0, 120], warning: [120, 140] },
    diastolicBP: { normal: [0, 80], warning: [80, 90] },
  };

  const rule = rules[key];
  if (!rule) return null;

  if (value >= rule.normal[0] && value <= rule.normal[1]) return 'normal';
  if (value > rule.normal[1] && value <= rule.warning[1]) return 'warning';
  return 'danger';
};

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
  const [records, setRecords] = useState<HealthCheckupRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyRecord);

  useEffect(() => {
    const loaded = getHealthCheckupRecords();
    setRecords(loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const handleSave = () => {
    if (!formData.date) {
      toast({ title: "날짜를 입력해주세요", variant: "destructive" });
      return;
    }

    let updated: HealthCheckupRecord[];
    if (editingId) {
      updated = records.map(r =>
        r.id === editingId ? { ...formData, id: editingId, createdAt: r.createdAt } : r
      );
      toast({ title: "수정되었습니다" });
    } else {
      const newRecord: HealthCheckupRecord = {
        ...formData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      updated = [...records, newRecord];
      toast({ title: "저장되었습니다" });
    }

    updated = updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(updated);
    setHealthCheckupRecords(updated);
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (record: HealthCheckupRecord) => {
    setEditingId(record.id);
    setFormData({
      date: record.date,
      bloodSugar: record.bloodSugar,
      hba1c: record.hba1c,
      cholesterol: record.cholesterol,
      triglyceride: record.triglyceride,
      ast: record.ast,
      alt: record.alt,
      creatinine: record.creatinine,
      systolicBP: record.systolicBP,
      diastolicBP: record.diastolicBP,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    setHealthCheckupRecords(updated);
    toast({ title: "삭제되었습니다" });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ ...emptyRecord, date: getTodayString() });
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const latestRecord = records[0];

  // Count statuses
  const getStatusSummary = (record: HealthCheckupRecord) => {
    const keys = ['bloodSugar', 'hba1c', 'cholesterol', 'triglyceride', 'ast', 'alt', 'creatinine', 'systolicBP', 'diastolicBP'];
    let normal = 0, warning = 0, danger = 0;
    
    keys.forEach(key => {
      const status = analyzeValue(key, record[key as keyof HealthCheckupRecord] as number | undefined);
      if (status === 'normal') normal++;
      if (status === 'warning') warning++;
      if (status === 'danger') danger++;
    });
    
    return { normal, warning, danger };
  };

  const fields = [
    { key: 'bloodSugar', label: '공복혈당', unit: 'mg/dL', icon: Droplets },
    { key: 'hba1c', label: '당화혈색소 (HbA1c)', unit: '%', icon: Activity },
    { key: 'cholesterol', label: '총 콜레스테롤', unit: 'mg/dL', icon: Heart },
    { key: 'triglyceride', label: '중성지방 (TG)', unit: 'mg/dL', icon: Activity },
    { key: 'ast', label: 'AST (간수치)', unit: 'U/L', icon: Activity },
    { key: 'alt', label: 'ALT (간수치)', unit: 'U/L', icon: Activity },
    { key: 'creatinine', label: '크레아티닌', unit: 'mg/dL', icon: Activity },
    { key: 'systolicBP', label: '수축기 혈압', unit: 'mmHg', icon: Heart },
    { key: 'diastolicBP', label: '이완기 혈압', unit: 'mmHg', icon: Heart },
  ];

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
            <h1 className="text-xl font-bold">건강검진 입력</h1>
          </div>
          <Button onClick={openNewDialog} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            기록
          </Button>
        </div>
      </div>

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
        {latestRecord ? (
          <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">최근 검진 결과</h2>
              <span className="text-sm text-muted-foreground">{latestRecord.date}</span>
            </div>

            {/* Status Summary */}
            {(() => {
              const { normal, warning, danger } = getStatusSummary(latestRecord);
              return (
                <div className="flex gap-3">
                  {normal > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-health-green/10 text-health-green rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" />
                      정상 {normal}
                    </div>
                  )}
                  {warning > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                      <AlertCircle className="w-4 h-4" />
                      주의 {warning}
                    </div>
                  )}
                  {danger > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      관리필요 {danger}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Values Grid */}
            <div className="grid grid-cols-2 gap-3">
              {fields.map(field => {
                const value = latestRecord[field.key as keyof HealthCheckupRecord] as number | undefined;
                if (value === undefined) return null;
                const status = analyzeValue(field.key, value);
                
                return (
                  <div key={field.key} className="bg-muted/50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{field.label}</span>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-lg font-semibold">
                      {value} <span className="text-sm font-normal text-muted-foreground">{field.unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">건강검진 기록이 없습니다</p>
            <Button className="mt-4" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-1" />
              검진 결과 입력
            </Button>
          </div>
        )}

        {/* Records List */}
        {records.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">기록 목록</h2>
            <div className="space-y-2">
              {records.map(record => {
                const { normal, warning, danger } = getStatusSummary(record);
                
                return (
                  <div
                    key={record.id}
                    className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{record.date}</p>
                      <div className="flex gap-2 mt-1 text-xs">
                        {normal > 0 && <span className="text-health-green">정상 {normal}</span>}
                        {warning > 0 && <span className="text-yellow-600">주의 {warning}</span>}
                        {danger > 0 && <span className="text-destructive">관리 {danger}</span>}
                      </div>
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
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "건강검진 수정" : "건강검진 입력"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">검진일 *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            
            {fields.map(field => (
              <div key={field.key} className="space-y-2">
                <label className="text-sm font-medium">{field.label} ({field.unit})</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={`예: ${field.key === 'hba1c' ? '5.5' : '100'}`}
                  value={formData[field.key as keyof typeof formData] || ''}
                  onChange={e => setFormData({ 
                    ...formData, 
                    [field.key]: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                />
              </div>
            ))}
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
