/**
 * Nutrition Recommendations Component
 * - 부족한 영양소 기반 추천
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Beef, Wheat, Droplet, Sparkles } from 'lucide-react';
import { NutritionTotals, NutritionGoals } from '@/lib/nutritionUtils';
import { cn } from '@/lib/utils';

interface NutritionRecommendationsProps {
  totals: NutritionTotals;
  goals: NutritionGoals;
}

interface Recommendation {
  type: 'protein' | 'carbs' | 'fat' | 'calories';
  icon: React.ReactNode;
  title: string;
  description: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
}

const PROTEIN_FOODS = ['닭가슴살 100g (165kcal)', '계란 2개 (140kcal)', '두부 반 모 (100kcal)', '그릭요거트 (120kcal)', '연어 100g (200kcal)'];
const LOW_CALORIE_FOODS = ['샐러드 (50kcal)', '오이 (15kcal)', '방울토마토 (20kcal)', '콘플레이크 + 우유 (200kcal)'];
const BALANCED_SNACKS = ['견과류 한 줌 (180kcal)', '바나나 1개 (100kcal)', '고구마 1개 (130kcal)'];

export function NutritionRecommendations({ totals, goals }: NutritionRecommendationsProps) {
  const recommendations = useMemo(() => {
    const result: Recommendation[] = [];
    
    const proteinPercent = (totals.totalProtein / goals.proteinGoalG) * 100;
    const caloriePercent = (totals.totalCalories / goals.calorieGoal) * 100;
    const carbPercent = (totals.totalCarbs / goals.carbGoalG) * 100;
    
    // 단백질 부족
    if (proteinPercent < 60) {
      const remaining = goals.proteinGoalG - totals.totalProtein;
      result.push({
        type: 'protein',
        icon: <Beef className="w-4 h-4" />,
        title: `단백질 ${Math.round(remaining)}g 부족`,
        description: '근육 유지와 포만감을 위해 단백질을 보충하세요',
        suggestions: PROTEIN_FOODS.slice(0, 3),
        severity: proteinPercent < 40 ? 'high' : 'medium',
      });
    }
    
    // 칼로리 과다
    if (caloriePercent > 100) {
      const excess = totals.totalCalories - goals.calorieGoal;
      result.push({
        type: 'calories',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: `목표 칼로리 ${excess}kcal 초과`,
        description: '다음 끼니는 가벼운 식사를 추천드려요',
        suggestions: LOW_CALORIE_FOODS.slice(0, 3),
        severity: caloriePercent > 120 ? 'high' : 'medium',
      });
    }
    
    // 칼로리 부족
    if (caloriePercent < 50 && new Date().getHours() >= 18) {
      const remaining = goals.calorieGoal - totals.totalCalories;
      result.push({
        type: 'calories',
        icon: <TrendingUp className="w-4 h-4" />,
        title: `${remaining}kcal 더 섭취 가능`,
        description: '건강한 간식으로 영양을 채워보세요',
        suggestions: BALANCED_SNACKS,
        severity: 'low',
      });
    }
    
    // 탄수화물 과다
    if (carbPercent > 120) {
      result.push({
        type: 'carbs',
        icon: <Wheat className="w-4 h-4" />,
        title: '탄수화물 섭취 주의',
        description: '다음 끼니는 단백질 위주로 드세요',
        suggestions: PROTEIN_FOODS.slice(0, 2),
        severity: 'medium',
      });
    }
    
    return result;
  }, [totals, goals]);
  
  if (recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">영양 균형이 좋아요!</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          현재 영양소 섭취 비율이 적정합니다. 이대로 유지하세요!
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        맞춤 추천
      </h3>
      
      {recommendations.map((rec, idx) => (
        <div
          key={idx}
          className={cn(
            "rounded-2xl p-4 border",
            rec.severity === 'high' && "bg-red-500/5 border-red-500/20",
            rec.severity === 'medium' && "bg-amber-500/5 border-amber-500/20",
            rec.severity === 'low' && "bg-blue-500/5 border-blue-500/20"
          )}
        >
          <div className={cn(
            "flex items-center gap-2 font-medium",
            rec.severity === 'high' && "text-red-600",
            rec.severity === 'medium' && "text-amber-600",
            rec.severity === 'low' && "text-blue-600"
          )}>
            {rec.icon}
            {rec.title}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {rec.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {rec.suggestions.map((suggestion, sIdx) => (
              <span
                key={sIdx}
                className="text-xs bg-background border border-border px-2 py-1 rounded-full"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
