/**
 * 끼니별 상세 시트 - 기록 수정/삭제 가능
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit2, Check, X, Loader2 } from "lucide-react";
import { MealType, MealFood, MealRecordServer } from "@/hooks/useServerSync";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

interface MealDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType;
  records: MealRecordServer[];
  onDelete: (recordId: string) => Promise<void>;
  onUpdate: (recordId: string, foods: MealFood[], totalCalories: number) => Promise<void>;
}

export function MealDetailSheet({
  open,
  onOpenChange,
  mealType,
  records,
  onDelete,
  onUpdate,
}: MealDetailSheetProps) {
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editingFoods, setEditingFoods] = useState<MealFood[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartEdit = (record: MealRecordServer) => {
    setEditingRecord(record.id);
    setEditingFoods([...record.foods]);
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditingFoods([]);
  };

  const handleSaveEdit = async (recordId: string) => {
    setLoading(true);
    const totalCalories = editingFoods.reduce((sum, f) => sum + f.calories, 0);
    await onUpdate(recordId, editingFoods, totalCalories);
    setEditingRecord(null);
    setEditingFoods([]);
    setLoading(false);
  };

  const handleFoodChange = (index: number, field: keyof MealFood, value: string | number) => {
    setEditingFoods((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              [field]: field === "name" || field === "portion" ? value : Number(value),
            }
          : f
      )
    );
  };

  const handleDeleteFood = (index: number) => {
    setEditingFoods((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setLoading(true);
    await onDelete(deleteConfirmId);
    setDeleteConfirmId(null);
    setLoading(false);
  };

  const totalCalories = records.reduce((sum, r) => sum + (r.total_calories || 0), 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] h-[80dvh] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center justify-between">
              <span>{MEAL_TYPE_LABELS[mealType]} 기록</span>
              <span className="text-primary">{totalCalories} kcal</span>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 overflow-y-auto max-h-[calc(80vh-100px)] pb-8">
            {records.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">
                아직 기록이 없습니다.
              </p>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="bg-card border border-border rounded-2xl p-4 space-y-3"
                >
                  {/* 이미지 */}
                  {record.image_url && (
                    <img
                      src={record.image_url}
                      alt="음식 이미지"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}

                  {/* 음식 리스트 */}
                  {editingRecord === record.id ? (
                    <div className="space-y-2">
                      {editingFoods.map((food, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={food.name}
                            onChange={(e) => handleFoodChange(idx, "name", e.target.value)}
                            className="flex-1 h-8 text-sm"
                            placeholder="음식명"
                          />
                          <Input
                            type="number"
                            value={food.calories}
                            onChange={(e) => handleFoodChange(idx, "calories", e.target.value)}
                            className="w-20 h-8 text-sm"
                            placeholder="kcal"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteFood(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(record.id)}
                          disabled={loading || editingFoods.length === 0}
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                          저장
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {record.foods.map((food, idx) => {
                          // 0이 아닌 영양소만 표시
                          const nutritionParts: string[] = [];
                          if (food.carbs && food.carbs > 0) nutritionParts.push(`탄 ${food.carbs}g`);
                          if (food.protein && food.protein > 0) nutritionParts.push(`단 ${food.protein}g`);
                          if (food.fat && food.fat > 0) nutritionParts.push(`지 ${food.fat}g`);
                          const nutritionText = nutritionParts.length > 0 ? ` · ${nutritionParts.join(' / ')}` : '';
                          
                          return (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>
                                {food.name} {food.portion && `(${food.portion})`}
                              </span>
                              <span className="text-muted-foreground">
                                {food.calories} kcal{nutritionText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleStartEdit(record)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(record.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
