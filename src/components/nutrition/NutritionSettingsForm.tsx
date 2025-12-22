/**
 * 영양 설정 입력 폼 컴포넌트
 * - 나이/키/현재체중/목표체중 입력
 * - 설정이 없을 때 유도 카드로 표시
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Save, X, Scale, Target } from "lucide-react";
import { useNutritionSettings, NutritionSettingsInput } from "@/hooks/useNutritionSettings";
import { useToast } from "@/hooks/use-toast";

interface NutritionSettingsFormProps {
  compact?: boolean;
}

export function NutritionSettingsForm({ compact = false }: NutritionSettingsFormProps) {
  const { settings, loading, saving, save, hasSettings } = useNutritionSettings();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");

  // 설정 로드 시 폼에 반영
  useEffect(() => {
    if (settings) {
      setAge(settings.age?.toString() || "");
      setHeightCm(settings.heightCm?.toString() || "");
      setCurrentWeight(settings.currentWeight?.toString() || "");
      setGoalWeight(settings.goalWeight?.toString() || "");
    }
  }, [settings]);

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

    const success = await save(input);
    if (success) {
      toast({ title: "설정이 저장되었습니다" });
      setIsEditing(false);
    } else {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    if (settings) {
      setAge(settings.age?.toString() || "");
      setHeightCm(settings.heightCm?.toString() || "");
      setCurrentWeight(settings.currentWeight?.toString() || "");
      setGoalWeight(settings.goalWeight?.toString() || "");
    }
    setIsEditing(false);
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
  if (!hasSettings && !isEditing) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-center">
          <Scale className="w-10 h-10 mx-auto mb-3 text-primary/60" />
          <h3 className="font-semibold text-lg mb-1">목표 설정하기</h3>
          <p className="text-sm text-muted-foreground mb-3">
            체중과 목표를 입력하면 맞춤 칼로리가 계산됩니다
          </p>
          <Button onClick={() => setIsEditing(true)}>
            <Target className="w-4 h-4 mr-2" />
            설정하기
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 수정 모드
  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>목표 설정</span>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">나이</label>
              <Input
                type="number"
                placeholder="30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">키 (cm)</label>
              <Input
                type="number"
                placeholder="170"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">현재 체중 (kg) *</label>
              <Input
                type="number"
                step="0.1"
                placeholder="70"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">목표 체중 (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="65"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Compact 모드 - 수정 버튼만
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="w-4 h-4" />
      </Button>
    );
  }

  // 일반 표시 모드
  return (
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
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
