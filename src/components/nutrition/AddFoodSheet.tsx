/**
 * 음식 추가 바텀시트
 * - 3갈래: 빠른 추가 / 직접 등록 / 사진 AI 분석
 * - 직접 입력: 음식명(필수) + 단위 OR g (중량 우선)
 * - AI가 영양정보 계산
 * - 수동 음식 추가: 사용자가 직접 영양정보 입력
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Image as ImageIcon, PenLine, Loader2, Zap, Plus } from "lucide-react";
import { MealType, MealFood } from "@/hooks/useServerSync";
import { useToast } from "@/hooks/use-toast";
import { QuickAddPanel } from "./QuickAddPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 직접 입력 상태
  const [manualName, setManualName] = useState("");
  const [manualGrams, setManualGrams] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 프리미엄 팝업 상태
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  // 수동 음식 추가 팝업 상태
  const [showManualFoodPopup, setShowManualFoodPopup] = useState(false);
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualFat, setManualFat] = useState("");

  // 코치 배정 여부 확인
  const hasCoach = !!profile?.assigned_coach_id;

  const resetForm = () => {
    setManualName("");
    setManualGrams("");
    setManualUnit("");
  };

  const resetManualFoodForm = () => {
    setManualFoodName("");
    setManualCalories("");
    setManualCarbs("");
    setManualProtein("");
    setManualFat("");
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

  // 사진 버튼 클릭 핸들러 - 권한 체크
  const handlePhotoClick = (type: "camera" | "gallery") => {
    if (!hasCoach) {
      setShowPremiumPopup(true);
      return;
    }
    
    if (type === "camera") {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  // +추가하기 버튼 활성화 조건: 음식명 + (단위 OR 중량)
  const canSave = manualName.trim() && (manualUnit.trim() || manualGrams.trim());

  // 수동 음식 추가 저장 버튼 활성화 조건: 음식명 + 칼로리
  const canSaveManualFood = manualFoodName.trim() && manualCalories.trim() && parseInt(manualCalories) > 0;

  // 직접 입력 저장 - AI로 영양정보 계산 (중량 우선)
  const handleManualSave = async () => {
    if (!manualName.trim()) {
      toast({ title: "음식명을 입력해주세요", variant: "destructive" });
      return;
    }

    if (!manualUnit.trim() && !manualGrams.trim()) {
      toast({ title: "단위 또는 중량(g)을 입력해주세요", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      // 중량 우선 계산
      const grams = manualGrams.trim() ? parseInt(manualGrams) : null;
      const unit = !grams && manualUnit.trim() ? manualUnit.trim() : null;

      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: {
          foodName: manualName.trim(),
          grams: grams,
          unit: unit,
        },
      });

      if (error) throw error;

      // 표시할 portion 라벨
      const portionLabel = grams 
        ? `${grams}g` 
        : manualUnit.trim();

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
      const grams = manualGrams ? parseInt(manualGrams) : 200;
      const food: MealFood = {
        name: manualName.trim(),
        calories: Math.round(grams * 1.5),
        carbs: Math.round(grams * 0.3),
        protein: Math.round(grams * 0.1),
        fat: Math.round(grams * 0.05),
        portion: manualGrams ? `${manualGrams}g` : manualUnit || "1인분",
      };
      onFoodsSelected([food]);
      handleClose();
      toast({ title: "추정값으로 저장되었습니다" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 수동 음식 추가 저장
  const handleManualFoodSave = () => {
    if (!manualFoodName.trim() || !manualCalories.trim()) {
      toast({ title: "음식명과 칼로리를 입력해주세요", variant: "destructive" });
      return;
    }

    const food: MealFood = {
      name: manualFoodName.trim(),
      calories: parseInt(manualCalories) || 0,
      carbs: parseInt(manualCarbs) || 0,
      protein: parseInt(manualProtein) || 0,
      fat: parseInt(manualFat) || 0,
      portion: "1인분",
    };

    onFoodsSelected([food]);
    resetManualFoodForm();
    setShowManualFoodPopup(false);
    handleClose();
    toast({ title: `${food.name} 추가됨 (${food.calories}kcal)` });
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
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent 
          side="bottom" 
          className="h-[80vh] h-[80dvh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"
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
            {/* 탭 순서: 빠른추가 - 직접 - 사진 */}
            <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
              <TabsTrigger value="quick" className="gap-1 text-xs">
                <Zap className="w-3 h-3" />
                빠른추가
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1 text-xs">
                <PenLine className="w-3 h-3" />
                직접
              </TabsTrigger>
              <TabsTrigger value="photo" className="gap-1 text-xs">
                <Camera className="w-3 h-3" />
                사진
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

            {/* 직접 입력 탭 */}
            <TabsContent value="manual" className="flex-1 overflow-y-auto space-y-4">
              {/* 음식명 (필수) */}
              <div>
                <label className="text-sm font-medium">음식명 *</label>
                <Input
                  placeholder="예: 삶은 계란, 흰쌀밥"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* 단위 입력 */}
              <div>
                <label className="text-sm font-medium">단위</label>
                <Input
                  placeholder="예: 2, 2개, 2컵, 2그릇"
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  className="mt-1"
                />
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
                  onChange={(e) => setManualGrams(e.target.value)}
                  className="mt-1"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                단위와 중량 모두 입력 시 중량을 우선 계산해요
              </p>

              <Button 
                className="w-full h-12" 
                onClick={handleManualSave}
                disabled={isAnalyzing || !canSave}
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

              {/* 수동 음식 추가 안내 */}
              <div className="flex flex-col items-center gap-2 pt-4">
                <p className="text-sm text-muted-foreground">
                  원하는 음식을 찾을 수 없나요?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualFoodPopup(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  음식추가
                </Button>
              </div>
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
                  onClick={() => handlePhotoClick("camera")}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  카메라로 촬영
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 text-base"
                  onClick={() => handlePhotoClick("gallery")}
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  갤러리에서 선택
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* 프리미엄 기능 안내 팝업 */}
      <Dialog open={showPremiumPopup} onOpenChange={setShowPremiumPopup}>
        <DialogContent className="max-w-[320px] min-h-[240px] rounded-2xl flex items-center justify-center">
          <DialogHeader className="text-center">
            <DialogTitle className="sr-only">프리미엄 기능</DialogTitle>
            <DialogDescription className="text-base text-foreground">
              프리미엄 회원님들을 위한 기능입니다.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 수동 음식 추가 팝업 */}
      <Sheet open={showManualFoodPopup} onOpenChange={(open) => {
        if (!open) resetManualFoodForm();
        setShowManualFoodPopup(open);
      }}>
        <SheetContent 
          side="bottom" 
          className="h-[80vh] h-[80dvh] rounded-t-3xl w-full max-w-[420px] mx-auto left-1/2 -translate-x-1/2 flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-4 flex-shrink-0">
            <SheetTitle>음식 직접 추가</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* 음식명 (필수) */}
            <div>
              <label className="text-sm font-medium">음식명 *</label>
              <Input
                placeholder="예: 삶은 계란"
                value={manualFoodName}
                onChange={(e) => setManualFoodName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* 섭취칼로리 (필수) */}
            <div>
              <label className="text-sm font-medium">섭취칼로리 (kcal) *</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="예: 150"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* 구분선 */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">선택 입력</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* 탄수화물 (선택) */}
            <div>
              <label className="text-sm font-medium">탄수화물 (g)</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="예: 20"
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* 단백질 (선택) */}
            <div>
              <label className="text-sm font-medium">단백질 (g)</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="예: 10"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* 지방 (선택) */}
            <div>
              <label className="text-sm font-medium">지방 (g)</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="예: 5"
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="pt-4 flex-shrink-0">
            <Button 
              className="w-full h-12" 
              onClick={handleManualFoodSave}
              disabled={!canSaveManualFood}
            >
              <Plus className="w-4 h-4 mr-2" />
              추가하기
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
