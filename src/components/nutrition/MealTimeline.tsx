/**
 * 식사 기록 타임라인 (끼니별)
 */

import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Utensils } from "lucide-react";
import { MealType, MealRecordServer } from "@/hooks/useServerSync";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

interface MealTimelineProps {
  recordsByMealType: Record<MealType, MealRecordServer[]>;
  onEdit: (record: MealRecordServer) => void;
  onDelete: (recordId: string) => void;
}

export function MealTimeline({ recordsByMealType, onEdit, onDelete }: MealTimelineProps) {
  const hasAnyRecords = Object.values(recordsByMealType).some(records => records.length > 0);

  if (!hasAnyRecords) {
    return (
      <div className="bg-muted rounded-2xl p-8 text-center">
        <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">이 날의 기록이 없어요</p>
      </div>
    );
  }

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className="space-y-4">
      {mealTypes.map((mealType) => {
        const records = recordsByMealType[mealType];
        if (records.length === 0) return null;

        return (
          <div key={mealType}>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {MEAL_TYPE_LABELS[mealType]}
            </p>
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-card rounded-xl border border-border p-3"
                >
                  <div className="flex gap-3">
                    {/* 이미지 */}
                    {record.image_url && (
                      <img
                        src={record.image_url}
                        alt="식사"
                        className="w-16 h-16 rounded-lg object-cover bg-muted flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {record.foods.map((f, i) => (
                            <p key={i} className="text-sm truncate">
                              {f.name} ({f.portion}) - {f.calories}kcal
                            </p>
                          ))}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(record)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => onDelete(record.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-base font-bold text-primary mt-1">
                        {record.total_calories} kcal
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
