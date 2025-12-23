/**
 * 음식 추가 바텀시트
 * - 3갈래: 빠른 추가 / 사진 AI 분석 / 직접 등록
 * - 직접 입력: 음식명(필수) + 인분 OR g 선택 (둘 중 하나만)
 * - AI가 영양정보 계산
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Camera, Image as ImageIcon, PenLine, Loader2, Zap, Plus } from "lucide-react";
import { MealType, MealFood } from "@/hooks/useServerSync";
import { useToast } from "@/hooks/use-toast";
import { QuickAddPanel } from "./QuickAddPanel";
import { supabase } from "@/integrations/supabase/client";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

// 인분 옵션
const PORTION_OPTIONS = [
  { label: "0.5인분", value: 0.5 },
  { label: "1인분", value: 1 },
  { label: "1.5인분", value: 1.5 },
  { label: "2인분", value: 2 },
];

interface AddFoodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType;
  onFoodsSelected: (foods: MealFood[], imageFile?: File) => void;
  onAnalyzeImage: (file: File) => void;
}

export function AddFoodSheet({
  open,
  onOpenChange,
  mealType,
  onFoodsSelected,
  onAnalyzeImage,
}: AddFoodSheetProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 직접 입력 상태
  const [manualName, setManualName] = useState("");
  const [manualGrams, setManualGrams] = useState("");
  const [selectedPortion, setSelectedPortion] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<"portion" | "grams" | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetForm = () => {
    setManualName("");
    setManualGrams("");
    setSelectedPortion(null);
    setInputMode(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // 인분 선택 시 g 입력 비활성화
  const handlePortionSelect = (value: number) => {
    setSelectedPortion(value);
    setManualGrams("");
    setInputMode("portion");
  };

  // g 입력 시 인분 선택 해제
  const handleGramsChange = (value: string) => {
    setManualGrams(value);
    if (value) {
      setSelectedPortion(null);
      setInputMode("grams");
    } else {
      setInputMode(null);
    }
  };

  // 이미지 선택 처리
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    
    handleClose();
    onAnalyzeImage(file);
  };

  // 직접 입력 저장 - AI로 영양정보 계산
  const handleManualSave = async () => {
    if (!manualName.trim()) {
      toast({ title: "음식명을 입력해주세요", variant: "destructive" });
      return;
    }

    if (!selectedPortion && !manualGrams) {
      toast({ title: "인분 또는 중량(g)을 입력해주세요", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      // AI로 영양정보 추정
      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: {
          foodName: manualName.trim(),
          grams: manualGrams ? parseInt(manualGrams) : null,
          portion: selectedPortion,
        },
      });

      if (error) throw error;

      const portionLabel = selectedPortion 
        ? `${selectedPortion}인분` 
        : `${manualGrams}g`;

      const food: MealFood = {
        name: manualName.trim(),
        calories: data?.calories || 200,
        carbs: data?.carbs || 25,
        protein: data?.protein || 10,
        fat: data?.fat || 8,
        portion: portionLabel,
      };

      onFoodsSelected([food]);
      handleClose();
      toast({ title: `${food.name} 추가됨 (${food.calories}kcal)` });
    } catch (err) {
      console.error("AI analysis error:", err);
      // 실패 시 기본 추정값으로 저장
      const grams = manualGrams ? parseInt(manualGrams) : (selectedPortion ? selectedPortion * 200 : 200);
      const food: MealFood = {
        name: manualName.trim(),
        calories: Math.round(grams * 1.5),
        carbs: Math.round(grams * 0.3),
        protein: Math.round(grams * 0.1),
        fat: Math.round(grams * 0.05),
        portion: selectedPortion ? `${selectedPortion}인분` : `${manualGrams}g`,
      };
      onFoodsSelected([food]);
      handleClose();
      toast({ title: "추정값으로 저장되었습니다" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 빠른 추가에서 단일 음식 추가
  const handleQuickAddFood = (food: MealFood) => {
    onFoodsSelected([food]);
    toast({ title: `${food.name} 추가됨` });
    handleClose();
  };

  // 빠른 추가에서 여러 음식 추가
  const handleQuickAddFoods = (foods: MealFood[]) => {
    onFoodsSelected(foods);
    toast({ title: `${foods.length}개 음식 추가됨` });
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 flex flex-col"
      >
        <SheetHeader className="pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {MEAL_TYPE_LABELS[mealType]} 추가하기
          </SheetTitle>
        </SheetHeader>

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

        <Tabs defaultValue="quick" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
            <TabsTrigger value="quick" className="gap-1 text-xs">
              <Zap className="w-3 h-3" />
              빠른추가
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-1 text-xs">
              <Camera className="w-3 h-3" />
              사진
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1 text-xs">
              <PenLine className="w-3 h-3" />
              직접
            </TabsTrigger>
          </TabsList>

          {/* 빠른 추가 탭 */}
          <TabsContent value="quick" className="flex-1 overflow-y-auto">
            <QuickAddPanel
              mealType={mealType}
              onAddFood={handleQuickAddFood}
              onAddFoods={handleQuickAddFoods}
            />
          </TabsContent>

          {/* 사진 탭 */}
          <TabsContent value="photo" className="flex-1 overflow-y-auto space-y-4">
            <p className="text-muted-foreground text-center">
              음식 사진을 찍으면 AI가 분석해드려요
            </p>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="h-14 text-base"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5 mr-2" />
                카메라로 촬영
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 text-base"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                갤러리에서 선택
              </Button>
            </div>
          </TabsContent>

          {/* 직접 입력 탭 */}
          <TabsContent value="manual" className="flex-1 overflow-y-auto space-y-4">
            {/* 음식명 (필수) */}
            <div>
              <label className="text-sm font-medium">음식명 *</label>
              <Input
                placeholder="예: 김치찌개"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* 인분 선택 */}
            <div>
              <label className="text-sm font-medium">인분 선택</label>
              <div className="flex flex-nowrap gap-2 mt-1 overflow-x-auto">
                {PORTION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={selectedPortion === opt.value ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-4 text-sm shrink-0"
                    onClick={() => handlePortionSelect(opt.value)}
                    disabled={inputMode === "grams"}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 또는 구분선 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">또는</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* g 입력 */}
            <div>
              <label className="text-sm font-medium">중량 (g)</label>
              <Input
                type="number"
                placeholder="예: 300"
                value={manualGrams}
                onChange={(e) => handleGramsChange(e.target.value)}
                className="mt-1"
                disabled={inputMode === "portion"}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              음식명과 양을 입력하면 AI가 칼로리/탄단지를 계산해요
            </p>

            <Button 
              className="w-full h-12" 
              onClick={handleManualSave}
              disabled={isAnalyzing || !manualName.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  추가하기
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}