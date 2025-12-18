import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Flag,
} from "lucide-react";
import {
  getWeightRecords,
  setWeightRecords,
  getWeightGoal,
  setWeightGoal,
  WeightRecord,
  WeightGoal,
  generateId,
  getTodayString,
} from "@/lib/localStorage";

export default function WeightTracking() {
  const { toast } = useToast();
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [goal, setGoalState] = useState<WeightGoal | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(getTodayString());
  const [goalForm, setGoalForm] = useState({
    targetWeight: "",
    targetDate: "",
  });

  useEffect(() => {
    const loaded = getWeightRecords();
    setRecords(loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setGoalState(getWeightGoal());
  }, []);

  const handleAddRecord = () => {
    const weight = parseFloat(newWeight);
    if (!weight || !newDate) {
      toast({ title: "체중과 날짜를 입력해주세요", variant: "destructive" });
      return;
    }

    const newRecord: WeightRecord = {
      id: generateId(),
      date: newDate,
      weight,
      createdAt: new Date().toISOString(),
    };

    const updated = [...records, newRecord].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setRecords(updated);
    setWeightRecords(updated);

    // If no goal exists, set this as start weight
    if (!goal && updated.length === 1) {
      // Prompt to set goal
    }

    toast({ title: "체중이 기록되었습니다" });
    setRecordDialogOpen(false);
    setNewWeight("");
    setNewDate(getTodayString());
  };

  const handleSetGoal = () => {
    const targetWeight = parseFloat(goalForm.targetWeight);
    if (!targetWeight || !goalForm.targetDate) {
      toast({ title: "목표 체중과 기간을 입력해주세요", variant: "destructive" });
      return;
    }

    const latestWeight = records[0]?.weight || targetWeight;
    const newGoal: WeightGoal = {
      targetWeight,
      targetDate: goalForm.targetDate,
      startWeight: latestWeight,
      startDate: getTodayString(),
    };

    setGoalState(newGoal);
    setWeightGoal(newGoal);
    toast({ title: "목표가 설정되었습니다" });
    setGoalDialogOpen(false);
  };

  const latestRecord = records[0];
  const previousRecord = records[1];

  // Calculate progress
  const getProgress = () => {
    if (!goal || !latestRecord) return null;
    
    const totalChange = goal.startWeight - goal.targetWeight;
    const currentChange = goal.startWeight - latestRecord.weight;
    const progress = totalChange !== 0 ? (currentChange / totalChange) * 100 : 0;
    
    return {
      progress: Math.min(Math.max(progress, 0), 100),
      remaining: latestRecord.weight - goal.targetWeight,
      isLosing: goal.targetWeight < goal.startWeight,
    };
  };

  const progressData = getProgress();

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
            <h1 className="text-xl font-bold">체중 기록</h1>
          </div>
          <Button onClick={() => setRecordDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            기록
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Weight Card */}
        <div className="bg-card rounded-3xl border border-border p-6">
          {latestRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Scale className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">현재 체중</p>
                    <p className="text-3xl font-bold">
                      {latestRecord.weight}
                      <span className="text-lg font-normal text-muted-foreground">kg</span>
                    </p>
                  </div>
                </div>
                {previousRecord && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                    latestRecord.weight < previousRecord.weight 
                      ? 'bg-health-green/10 text-health-green' 
                      : latestRecord.weight > previousRecord.weight
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {latestRecord.weight < previousRecord.weight ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : latestRecord.weight > previousRecord.weight ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : null}
                    <span className="font-medium">
                      {(latestRecord.weight - previousRecord.weight).toFixed(1)}kg
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                마지막 기록: {latestRecord.date}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">체중 기록이 없습니다</p>
              <Button className="mt-4" onClick={() => setRecordDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                첫 기록 추가
              </Button>
            </div>
          )}
        </div>

        {/* Goal Card */}
        <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              목표 체중
            </h2>
            <Button variant="outline" size="sm" onClick={() => setGoalDialogOpen(true)}>
              {goal ? '수정' : '설정'}
            </Button>
          </div>

          {goal ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{goal.targetWeight}kg</p>
                  <p className="text-sm text-muted-foreground">목표일: {goal.targetDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">시작 체중</p>
                  <p className="font-medium">{goal.startWeight}kg</p>
                </div>
              </div>

              {progressData && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">진행률</span>
                    <span className="font-medium">{progressData.progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${progressData.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {progressData.remaining > 0 
                      ? `목표까지 ${Math.abs(progressData.remaining).toFixed(1)}kg ${progressData.isLosing ? '감량' : '증량'} 필요`
                      : '🎉 목표 달성!'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              목표를 설정하고 진행 상황을 확인하세요
            </p>
          )}
        </div>

        {/* Records List */}
        {records.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              기록 목록
            </h2>
            <div className="space-y-2">
              {records.slice(0, 10).map((record, index) => {
                const prev = records[index + 1];
                const diff = prev ? record.weight - prev.weight : null;
                
                return (
                  <div
                    key={record.id}
                    className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.date).toLocaleDateString('ko-KR', { month: 'short' })}
                        </p>
                        <p className="text-lg font-bold">
                          {new Date(record.date).getDate()}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">{record.weight}kg</p>
                      </div>
                    </div>
                    {diff !== null && (
                      <span className={`text-sm font-medium ${
                        diff < 0 ? 'text-health-green' : diff > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}kg
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Record Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>체중 기록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">날짜</label>
              <Input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">체중 (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="65.0"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>취소</Button>
            <Button onClick={handleAddRecord}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <Flag className="w-5 h-5 inline mr-2" />
              목표 설정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">목표 체중 (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="60.0"
                value={goalForm.targetWeight}
                onChange={e => setGoalForm({ ...goalForm, targetWeight: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">목표일</label>
              <Input
                type="date"
                value={goalForm.targetDate}
                onChange={e => setGoalForm({ ...goalForm, targetDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>취소</Button>
            <Button onClick={handleSetGoal}>설정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
