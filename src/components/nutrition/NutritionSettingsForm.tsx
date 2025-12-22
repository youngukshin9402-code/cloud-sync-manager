/**
 * 영양 설정 입력 폼 컴포넌트
 * - 나이/키/현재체중/목표체중 입력
 * - 설정이 없을 때 유도 카드로 표시
 * - 낙관적 업데이트: 즉시 화면 반영, 백그라운드 저장
 * - Dialog 사용으로 가독성 개선
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Save, Scale, Target, Loader2 } from "lucide-react";
import { useNutritionSettings, NutritionSettingsInput } from "@/hooks/useNutritionSettings";
import { calculateNutritionGoals } from "@/lib/nutritionUtils";
import { useToast } from "@/hooks/use-toast";

interface NutritionSettingsFormProps {
  compact?: boolean;
  onGoalsUpdate?: (goals: { calorieGoal: number; carbGoalG: number; proteinGoalG: number; fatGoalG: number }) => void;
}

export function NutritionSettingsForm({ compact = false, onGoalsUpdate }: NutritionSettingsFormProps) {
  const { settings, loading, saving, save, hasSettings } = useNutritionSettings();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 설정 로드 시 폼에 반영
  useEffect(() => {
    if (settings) {
      setAge(settings.age?.toString() || "");
      setHeightCm(settings.heightCm?.toString() || "");
      setCurrentWeight(settings.currentWeight?.toString() || "");
      setGoalWeight(settings.goalWeight?.toString() || "");
    }
  }, [settings]);

  // 다이얼로그 열릴 때 현재 설정값으로 초기화
  useEffect(() => {
    if (isOpen && settings) {
      setAge(settings.age?.toString() || "");
      setHeightCm(settings.heightCm?.toString() || "");
      setCurrentWeight(settings.currentWeight?.toString() || "");
      setGoalWeight(settings.goalWeight?.toString() || "");
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    const input: NutritionSettingsInput = {
      age: age ? parseInt(age) : undefined,
      heightCm: heightCm ? parseInt(heightCm) : undefined,
      currentWeight: currentWeight ? parseFloat(currentWeight) : undefined,
      goalWeight: goalWeight ? parseFloat(goalWeight) : undefined,
    };

    if (!input.currentWeight || input.currentWeight <= 0) {
      toast({ title: "현재 체중을 입력해주세요", variant: "destructive" });
      return;
    }

    // 1. 즉시 목표 계산 및 화면 반영 (낙관적 업데이트)
    const calculatedGoals = calculateNutritionGoals({
      currentWeight: input.currentWeight,
      goalWeight: input.goalWeight,
    });

    if (onGoalsUpdate) {
      onGoalsUpdate(calculatedGoals);
    }

    // 폼 닫기 (사용자에게 즉각 피드백)
    setIsOpen(false);
    toast({ title: "목표가 업데이트되었습니다!" });

    // 2. 백그라운드에서 서버 저장
    setIsSaving(true);
    const success = await save(input);
    setIsSaving(false);

    if (!success) {
      toast({ 
        title: "저장 실패", 
        description: "네트워크 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // 설정이 없을 때 - 유도 카드
  if (!hasSettings && !isOpen) {
    return (
      <>
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Scale className="w-10 h-10 mx-auto mb-3 text-primary/60" />
            <h3 className="font-semibold text-lg mb-1">목표 설정하기</h3>
            <p className="text-sm text-muted-foreground mb-3">
              체중과 목표를 입력하면 맞춤 칼로리가 계산됩니다
            </p>
            <Button onClick={() => setIsOpen(true)} className="min-h-[48px] px-6">
              <Target className="w-4 h-4 mr-2" />
              설정하기
            </Button>
          </CardContent>
        </Card>
        
        <SettingsDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          age={age}
          setAge={setAge}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          currentWeight={currentWeight}
          setCurrentWeight={setCurrentWeight}
          goalWeight={goalWeight}
          setGoalWeight={setGoalWeight}
          onSave={handleSave}
          saving={saving || isSaving}
        />
      </>
    );
  }

  // Compact 모드 - 수정 버튼만
  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-white/10 hover:bg-white/20"
          onClick={() => setIsOpen(true)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        
        <SettingsDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          age={age}
          setAge={setAge}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          currentWeight={currentWeight}
          setCurrentWeight={setCurrentWeight}
          goalWeight={goalWeight}
          setGoalWeight={setGoalWeight}
          onSave={handleSave}
          saving={saving || isSaving}
        />
      </>
    );
  }

  // 일반 표시 모드
  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {settings?.age && <span>나이: {settings.age}세</span>}
              {settings?.heightCm && <span>키: {settings.heightCm}cm</span>}
              <span>체중: {settings?.currentWeight || "-"}kg</span>
              <span>목표: {settings?.goalWeight || "-"}kg</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(true)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <SettingsDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        age={age}
        setAge={setAge}
        heightCm={heightCm}
        setHeightCm={setHeightCm}
        currentWeight={currentWeight}
        setCurrentWeight={setCurrentWeight}
        goalWeight={goalWeight}
        setGoalWeight={setGoalWeight}
        onSave={handleSave}
        saving={saving || isSaving}
      />
    </>
  );
}

// 별도 Dialog 컴포넌트
interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  age: string;
  setAge: (v: string) => void;
  heightCm: string;
  setHeightCm: (v: string) => void;
  currentWeight: string;
  setCurrentWeight: (v: string) => void;
  goalWeight: string;
  setGoalWeight: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}

function SettingsDialog({
  isOpen,
  onClose,
  age,
  setAge,
  heightCm,
  setHeightCm,
  currentWeight,
  setCurrentWeight,
  goalWeight,
  setGoalWeight,
  onSave,
  saving,
}: SettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-primary" />
            목표 설정
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">나이</label>
              <Input
                type="number"
                placeholder="30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">키 (cm)</label>
              <Input
                type="number"
                placeholder="170"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                현재 체중 (kg) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="70"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">목표 체중 (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="65"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            체중 정보를 기반으로 일일 권장 칼로리와 영양소가 자동 계산됩니다.
          </p>

          <Button 
            className="w-full h-12 text-base font-medium" 
            onClick={onSave} 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                저장하기
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}