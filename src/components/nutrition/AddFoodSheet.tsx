/**
 * 음식 추가 바텀시트
 * - 3갈래: 빠른 추가 / 사진 AI 분석 / 직접 등록
 * - 검색 탭 제거 (AI 검색만 사용)
 * - 세트 버튼 제거
 */

import { useState, useRef } from "react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetForm = () => {
    setManualName("");
    setManualGrams("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
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

    const grams = parseInt(manualGrams) || 100;
    
    setIsAnalyzing(true);
    try {
      // AI로 영양정보 추정
      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: {
          foodName: manualName.trim(),
          grams,
        },
      });

      if (error) throw error;

      const food: MealFood = {
        name: manualName.trim(),
        calories: data?.calories || Math.round(grams * 1.5),
        carbs: data?.carbs || Math.round(grams * 0.3),
        protein: data?.protein || Math.round(grams * 0.1),
        fat: data?.fat || Math.round(grams * 0.05),
        portion: `${grams}g`,
      };

      onFoodsSelected([food]);
      handleClose();
    } catch (err) {
      console.error("AI analysis error:", err);
      // 실패 시 기본 추정값으로 저장
      const food: MealFood = {
        name: manualName.trim(),
        calories: Math.round(grams * 1.5),
        carbs: Math.round(grams * 0.3),
        protein: Math.round(grams * 0.1),
        fat: Math.round(grams * 0.05),
        portion: `${grams}g`,
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

  // 빠른 추가에서 여러 음식 추가 (세트)
  const handleQuickAddFoods = (foods: MealFood[]) => {
    onFoodsSelected(foods);
    toast({ title: `${foods.length}개 음식 추가됨` });
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 flex flex-col">
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

          {/* 직접 입력 탭 - 음식명 + g만 입력, AI가 영양정보 계산 */}
          <TabsContent value="manual" className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="text-sm font-medium">음식명 *</label>
              <Input
                placeholder="예: 김치찌개"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">중량 (g)</label>
              <Input
                type="number"
                placeholder="예: 300"
                value={manualGrams}
                onChange={(e) => setManualGrams(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                음식명과 중량을 입력하면 AI가 칼로리/탄단지를 계산해요
              </p>
            </div>
            <Button 
              className="w-full h-12" 
              onClick={handleManualSave}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  분석 중...
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