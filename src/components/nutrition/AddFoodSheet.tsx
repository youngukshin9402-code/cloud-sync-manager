/**
 * 음식 추가 바텀시트
 * - 4갈래: 빠른 추가 / 사진 AI 분석 / 직접 등록 / 검색
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
import { Camera, Image as ImageIcon, PenLine, Search, Sparkles, Loader2, Zap, Plus, Save } from "lucide-react";
import { MealType, MealFood } from "@/hooks/useServerSync";
import { PresetFood, searchPresetFoods, aiEstimateFood } from "@/lib/nutritionUtils";
import { useCustomFoods } from "@/hooks/useCustomFoods";
import { useMealSets } from "@/hooks/useMealSets";
import { useToast } from "@/hooks/use-toast";
import { QuickAddPanel } from "./QuickAddPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const { foods: customFoods, search: searchCustom } = useCustomFoods();
  const { add: addMealSet } = useMealSets();

  // 직접 입력 상태
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualFat, setManualFat] = useState("");

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"general" | "ai">("general");
  const [searchResults, setSearchResults] = useState<PresetFood[]>([]);
  const [aiResult, setAiResult] = useState<PresetFood | null>(null);
  const [searching, setSearching] = useState(false);

  // 세트 저장 다이얼로그
  const [showSaveSetDialog, setShowSaveSetDialog] = useState(false);
  const [pendingFoods, setPendingFoods] = useState<MealFood[]>([]);
  const [setName, setSetName] = useState("");

  const resetForm = () => {
    setManualName("");
    setManualCalories("");
    setManualCarbs("");
    setManualProtein("");
    setManualFat("");
    setSearchQuery("");
    setSearchResults([]);
    setAiResult(null);
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

  // 직접 입력 저장
  const handleManualSave = () => {
    if (!manualName.trim()) {
      toast({ title: "음식명을 입력해주세요", variant: "destructive" });
      return;
    }

    const food: MealFood = {
      name: manualName.trim(),
      calories: parseInt(manualCalories) || 0,
      carbs: parseInt(manualCarbs) || 0,
      protein: parseInt(manualProtein) || 0,
      fat: parseInt(manualFat) || 0,
      portion: "1인분",
    };

    onFoodsSelected([food]);
    handleClose();
  };

  // 일반 검색
  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    if (searchMode === "general") {
      const presetResults = searchPresetFoods(searchQuery);
      const customResults = searchCustom(searchQuery).map(c => ({
        name: c.name,
        calories: c.calories,
        carbs: c.carbs,
        protein: c.protein,
        fat: c.fat,
        portion: "1인분",
      }));
      setSearchResults([...customResults, ...presetResults].slice(0, 10));
      setAiResult(null);
    } else {
      setSearching(true);
      setTimeout(() => {
        const result = aiEstimateFood(searchQuery);
        setAiResult(result);
        setSearchResults([]);
        setSearching(false);
      }, 500);
    }
  };

  // 검색 결과 선택
  const handleSelectFood = (food: PresetFood) => {
    const mealFood: MealFood = {
      name: food.name,
      calories: food.calories,
      carbs: food.carbs,
      protein: food.protein,
      fat: food.fat,
      portion: food.portion,
    };
    onFoodsSelected([mealFood]);
    handleClose();
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

  // 세트로 저장
  const handleSaveAsSet = async () => {
    if (!setName.trim()) {
      toast({ title: "세트 이름을 입력해주세요", variant: "destructive" });
      return;
    }

    const success = await addMealSet({
      name: setName.trim(),
      mealType,
      foods: pendingFoods,
    });

    if (success) {
      toast({ title: "세트가 저장되었습니다" });
      setShowSaveSetDialog(false);
      setSetName("");
      setPendingFoods([]);
    } else {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
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

          <Tabs defaultValue="quick" className="h-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
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
              <TabsTrigger value="search" className="gap-1 text-xs">
                <Search className="w-3 h-3" />
                검색
              </TabsTrigger>
            </TabsList>

            {/* 빠른 추가 탭 */}
            <TabsContent value="quick" className="space-y-4">
              <QuickAddPanel
                mealType={mealType}
                onAddFood={handleQuickAddFood}
                onAddFoods={handleQuickAddFoods}
              />
            </TabsContent>

            {/* 사진 탭 */}
            <TabsContent value="photo" className="space-y-4">
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
            <TabsContent value="manual" className="space-y-4">
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
                <label className="text-sm font-medium">칼로리 (kcal)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">탄수화물 (g)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">단백질 (g)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">지방 (g)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button className="w-full h-12" onClick={handleManualSave}>
                <Plus className="w-4 h-4 mr-2" />
                추가하기
              </Button>
            </TabsContent>

            {/* 검색 탭 */}
            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={searchMode === "general" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchMode("general")}
                >
                  일반 검색
                </Button>
                <Button
                  variant={searchMode === "ai" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchMode("ai")}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI 검색
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={searchMode === "ai" ? "예: 김치찌개 1그릇" : "음식 이름 검색"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {aiResult && (
                  <div
                    className="p-3 bg-primary/5 border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/10"
                    onClick={() => handleSelectFood(aiResult)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="font-medium">{aiResult.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {aiResult.calories}kcal · 탄 {aiResult.carbs}g · 단 {aiResult.protein}g · 지 {aiResult.fat}g
                    </p>
                  </div>
                )}

                {searchResults.map((food, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectFood(food)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{food.name}</span>
                      <span className="text-sm text-muted-foreground">{food.portion}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {food.calories}kcal · 탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g
                    </p>
                  </div>
                ))}

                {!aiResult && searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-center text-muted-foreground py-4">
                    검색 결과가 없습니다
                  </p>
                )}

                {!searchQuery && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">인기 음식</p>
                    {searchPresetFoods("").map((food, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectFood(food)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{food.name}</span>
                          <span className="text-sm text-muted-foreground">{food.calories}kcal</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* 세트 저장 다이얼로그 */}
      <Dialog open={showSaveSetDialog} onOpenChange={setShowSaveSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세트로 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="세트 이름 (예: 아침 루틴)"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {pendingFoods.length}개 음식이 세트에 저장됩니다
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveSetDialog(false)}>
              취소
            </Button>
            <Button onClick={handleSaveAsSet}>
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
