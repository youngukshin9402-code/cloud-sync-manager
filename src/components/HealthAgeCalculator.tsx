import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Heart, Activity, Wine, Cigarette, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthAgeCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCalculated?: (healthAge: number) => void;
}

interface FormData {
  actualAge: number;
  weight: number;
  height: number;
  bodyFatPercent: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  bloodSugar: number | null;
  cholesterol: number | null;
  exerciseFrequency: string;
  drinkingFrequency: string;
  smokingStatus: string;
}

const defaultFormData: FormData = {
  actualAge: 50,
  weight: 65,
  height: 165,
  bodyFatPercent: null,
  systolicBp: null,
  diastolicBp: null,
  bloodSugar: null,
  cholesterol: null,
  exerciseFrequency: "sometimes",
  drinkingFrequency: "sometimes",
  smokingStatus: "never",
};

export function HealthAgeCalculator({ open, onOpenChange, onCalculated }: HealthAgeCalculatorProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [useAI, setUseAI] = useState(false);

  const calculateHealthAge = async () => {
    setIsCalculating(true);
    
    try {
      if (useAI) {
        // AI 기반 분석
        const { data, error } = await supabase.functions.invoke('calculate-health-age', {
          body: formData
        });
        
        if (error) throw error;
        setCalculatedAge(data.healthAge);
        onCalculated?.(data.healthAge);
      } else {
        // 간단한 공식 기반 계산
        let healthAge = formData.actualAge;
        
        // BMI 계산
        const heightM = formData.height / 100;
        const bmi = formData.weight / (heightM * heightM);
        
        // BMI 기반 조정
        if (bmi < 18.5) healthAge += 1;
        else if (bmi >= 18.5 && bmi < 25) healthAge -= 2;
        else if (bmi >= 25 && bmi < 30) healthAge += 2;
        else healthAge += 4;
        
        // 체지방률 기반 조정
        if (formData.bodyFatPercent) {
          if (formData.bodyFatPercent < 15) healthAge -= 1;
          else if (formData.bodyFatPercent > 30) healthAge += 2;
        }
        
        // 혈압 기반 조정
        if (formData.systolicBp) {
          if (formData.systolicBp < 120) healthAge -= 1;
          else if (formData.systolicBp >= 140) healthAge += 3;
          else if (formData.systolicBp >= 130) healthAge += 1;
        }
        
        // 혈당 기반 조정
        if (formData.bloodSugar) {
          if (formData.bloodSugar < 100) healthAge -= 1;
          else if (formData.bloodSugar >= 126) healthAge += 3;
          else if (formData.bloodSugar >= 110) healthAge += 1;
        }
        
        // 콜레스테롤 기반 조정
        if (formData.cholesterol) {
          if (formData.cholesterol < 200) healthAge -= 1;
          else if (formData.cholesterol >= 240) healthAge += 2;
        }
        
        // 운동 습관 기반 조정
        switch (formData.exerciseFrequency) {
          case "daily": healthAge -= 4; break;
          case "often": healthAge -= 2; break;
          case "sometimes": healthAge += 0; break;
          case "rarely": healthAge += 2; break;
          case "never": healthAge += 4; break;
        }
        
        // 음주 습관 기반 조정
        switch (formData.drinkingFrequency) {
          case "never": healthAge -= 1; break;
          case "rarely": healthAge += 0; break;
          case "sometimes": healthAge += 1; break;
          case "often": healthAge += 3; break;
          case "daily": healthAge += 5; break;
        }
        
        // 흡연 여부 기반 조정
        switch (formData.smokingStatus) {
          case "never": healthAge -= 2; break;
          case "quit": healthAge += 1; break;
          case "current": healthAge += 5; break;
        }
        
        // 최소/최대 제한
        healthAge = Math.max(formData.actualAge - 15, Math.min(formData.actualAge + 15, Math.round(healthAge)));
        
        setCalculatedAge(healthAge);
        onCalculated?.(healthAge);
      }
    } catch (error) {
      console.error('Health age calculation error:', error);
      // 에러 시 기본 공식으로 fallback
      let healthAge = formData.actualAge;
      setCalculatedAge(healthAge);
    } finally {
      setIsCalculating(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setCalculatedAge(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const getHealthAgeMessage = () => {
    if (!calculatedAge) return "";
    const diff = calculatedAge - formData.actualAge;
    
    if (diff <= -5) return "🎉 축하합니다! 매우 건강한 상태입니다!";
    if (diff < 0) return "😊 좋은 건강 상태를 유지하고 계시네요!";
    if (diff === 0) return "👍 나이에 맞는 평균적인 건강 상태입니다.";
    if (diff <= 5) return "⚠️ 생활습관 개선이 필요합니다.";
    return "🏥 건강관리에 더 신경 쓰시길 권장합니다.";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            건강 나이 계산기
          </DialogTitle>
        </DialogHeader>

        {calculatedAge !== null ? (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">당신의 건강 나이는</p>
              <div className="relative">
                <p className="text-6xl font-bold text-primary mb-2">{calculatedAge}세</p>
                <p className="text-lg text-muted-foreground">
                  (실제 나이: {formData.actualAge}세)
                </p>
              </div>
              
              <div className={`mt-4 p-4 rounded-xl ${
                calculatedAge <= formData.actualAge 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-amber-50 text-amber-700'
              }`}>
                <p className="font-medium">{getHealthAgeMessage()}</p>
              </div>

              <div className="mt-4 flex gap-2 justify-center">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  calculatedAge < formData.actualAge 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : calculatedAge === formData.actualAge
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {calculatedAge < formData.actualAge 
                    ? `${formData.actualAge - calculatedAge}세 젊음` 
                    : calculatedAge === formData.actualAge
                    ? '동일'
                    : `${calculatedAge - formData.actualAge}세 노화`}
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                다시 계산
              </Button>
              <Button onClick={handleClose} className="flex-1">
                확인
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* 기본 정보 */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                기본 정보 (필수)
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">나이</Label>
                  <Input
                    type="number"
                    value={formData.actualAge}
                    onChange={e => setFormData({...formData, actualAge: parseInt(e.target.value) || 0})}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">체중 (kg)</Label>
                  <Input
                    type="number"
                    value={formData.weight}
                    onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                    placeholder="65"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">키 (cm)</Label>
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={e => setFormData({...formData, height: parseFloat(e.target.value) || 0})}
                    placeholder="165"
                  />
                </div>
              </div>
            </div>

            {/* 건강 지표 (선택) */}
            <div className="space-y-3">
              <h3 className="font-medium text-muted-foreground">건강 지표 (선택)</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">체지방률 (%)</Label>
                  <Input
                    type="number"
                    value={formData.bodyFatPercent || ""}
                    onChange={e => setFormData({...formData, bodyFatPercent: e.target.value ? parseFloat(e.target.value) : null})}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">콜레스테롤</Label>
                  <Input
                    type="number"
                    value={formData.cholesterol || ""}
                    onChange={e => setFormData({...formData, cholesterol: e.target.value ? parseInt(e.target.value) : null})}
                    placeholder="180"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">수축기 혈압</Label>
                  <Input
                    type="number"
                    value={formData.systolicBp || ""}
                    onChange={e => setFormData({...formData, systolicBp: e.target.value ? parseInt(e.target.value) : null})}
                    placeholder="120"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">공복 혈당</Label>
                  <Input
                    type="number"
                    value={formData.bloodSugar || ""}
                    onChange={e => setFormData({...formData, bloodSugar: e.target.value ? parseInt(e.target.value) : null})}
                    placeholder="95"
                  />
                </div>
              </div>
            </div>

            {/* 생활 습관 */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                생활 습관
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">운동 빈도</Label>
                  <Select
                    value={formData.exerciseFrequency}
                    onValueChange={value => setFormData({...formData, exerciseFrequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">매일 운동</SelectItem>
                      <SelectItem value="often">주 3-5회</SelectItem>
                      <SelectItem value="sometimes">주 1-2회</SelectItem>
                      <SelectItem value="rarely">월 1-2회</SelectItem>
                      <SelectItem value="never">거의 안 함</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Wine className="w-3 h-3" />
                    음주 빈도
                  </Label>
                  <Select
                    value={formData.drinkingFrequency}
                    onValueChange={value => setFormData({...formData, drinkingFrequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">전혀 안 함</SelectItem>
                      <SelectItem value="rarely">월 1-2회</SelectItem>
                      <SelectItem value="sometimes">주 1-2회</SelectItem>
                      <SelectItem value="often">주 3-5회</SelectItem>
                      <SelectItem value="daily">매일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Cigarette className="w-3 h-3" />
                    흡연 여부
                  </Label>
                  <Select
                    value={formData.smokingStatus}
                    onValueChange={value => setFormData({...formData, smokingStatus: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">비흡연</SelectItem>
                      <SelectItem value="quit">금연 중</SelectItem>
                      <SelectItem value="current">현재 흡연</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={calculateHealthAge} 
                className="w-full"
                disabled={isCalculating || !formData.actualAge || !formData.weight || !formData.height}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    계산 중...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    건강 나이 계산하기
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}