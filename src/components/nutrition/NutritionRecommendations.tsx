/**
 * Nutrition Recommendations Component
 * - 부족한 영양소 기반 추천
 * - 지병(conditions) 기반 추천
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Beef, Wheat, Sparkles, Heart } from 'lucide-react';
import { NutritionTotals, NutritionGoals } from '@/lib/nutritionUtils';
import { cn } from '@/lib/utils';

interface NutritionRecommendationsProps {
  totals: NutritionTotals;
  goals: NutritionGoals;
  conditions?: string[] | null;
}

interface Recommendation {
  type: 'protein' | 'carbs' | 'fat' | 'calories' | 'condition';
  icon: React.ReactNode;
  title: string;
  description: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'info';
}

interface ConditionAdvice {
  avoid: string[];
  recommend: string[];
  note: string;
}

// 지병별 권장/피해야 할 음식 데이터
const CONDITION_ADVICE: Record<string, ConditionAdvice> = {
  '당뇨': {
    avoid: ['정제 탄수화물 (흰쌀밥, 흰빵)', '설탕/당류 음료', '과일 주스', '과자/케이크'],
    recommend: ['현미/잡곡밥', '채소류', '단백질 위주 식사', '식이섬유 풍부한 음식'],
    note: '혈당 급상승을 피하고 식이섬유를 함께 섭취하세요.',
  },
  '고혈압': {
    avoid: ['나트륨 많은 음식 (라면, 짠 국물)', '가공육', '절임류', '인스턴트 식품'],
    recommend: ['신선한 채소/과일', '저염 조리', '칼륨 풍부한 음식 (바나나, 시금치)', '불포화지방 음식'],
    note: '하루 나트륨 섭취를 2,000mg 이하로 제한하세요.',
  },
  '고지혈증': {
    avoid: ['포화지방 (삼겹살, 버터, 크림)', '트랜스지방', '튀김류', '패스트푸드'],
    recommend: ['오메가-3 지방산 (연어, 고등어)', '견과류', '올리브유', '귀리/오트밀'],
    note: '콜레스테롤 수치 관리를 위해 포화지방 섭취를 줄이세요.',
  },
  '고콜레스테롤': {
    avoid: ['포화지방 (삼겹살, 버터, 크림)', '트랜스지방', '계란 노른자 과다 섭취', '내장육'],
    recommend: ['식이섬유 (귀리, 콩류)', '생선류', '견과류', '콩단백'],
    note: 'LDL 콜레스테롤을 낮추기 위해 식이섬유 섭취를 늘리세요.',
  },
  '통풍': {
    avoid: ['퓨린 높은 음식 (내장, 조개류, 맥주)', '술', '과당 음료', '붉은 고기 과다'],
    recommend: ['물 충분히 마시기', '저지방 유제품', '체리/베리류', '채소류'],
    note: '수분 섭취를 늘리고 퓨린 함량이 높은 음식을 피하세요.',
  },
  '신장질환': {
    avoid: ['고나트륨 음식', '고칼륨 음식 (바나나, 토마토)', '고인 음식', '가공식품'],
    recommend: ['저염 조리', '의사와 상담한 식단', '신선한 재료 사용'],
    note: '신장 기능에 따라 개인별 식이 조절이 필요합니다. 전문의와 상담하세요.',
  },
  '빈혈': {
    avoid: ['카페인과 철분 식품 동시 섭취', '칼슘 보충제와 철분 동시 섭취'],
    recommend: ['철분 풍부한 음식 (소고기, 시금치, 콩류)', '비타민 C와 함께 섭취', '조개류'],
    note: '철분 흡수를 위해 비타민 C가 풍부한 음식과 함께 드세요.',
  },
};

const PROTEIN_FOODS = ['닭가슴살 100g (165kcal)', '계란 2개 (140kcal)', '두부 반 모 (100kcal)', '그릭요거트 (120kcal)', '연어 100g (200kcal)'];
const LOW_CALORIE_FOODS = ['샐러드 (50kcal)', '오이 (15kcal)', '방울토마토 (20kcal)', '콘플레이크 + 우유 (200kcal)'];
const BALANCED_SNACKS = ['견과류 한 줌 (180kcal)', '바나나 1개 (100kcal)', '고구마 1개 (130kcal)'];

// 지병 이름 정규화 (유사어 매칭)
function normalizeCondition(condition: string): string | null {
  const lower = condition.toLowerCase().replace(/\s+/g, '');
  
  if (lower.includes('당뇨') || lower.includes('diabetes')) return '당뇨';
  if (lower.includes('고혈압') || lower.includes('hypertension')) return '고혈압';
  if (lower.includes('고지혈') || lower.includes('이상지질') || lower.includes('hyperlipidemia')) return '고지혈증';
  if (lower.includes('콜레스테롤') || lower.includes('cholesterol')) return '고콜레스테롤';
  if (lower.includes('통풍') || lower.includes('gout')) return '통풍';
  if (lower.includes('신장') || lower.includes('신부전') || lower.includes('kidney')) return '신장질환';
  if (lower.includes('빈혈') || lower.includes('anemia')) return '빈혈';
  
  return null;
}

export function NutritionRecommendations({ totals, goals, conditions }: NutritionRecommendationsProps) {
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

  // 지병 기반 추천 생성
  const conditionRecommendations = useMemo(() => {
    if (!conditions || conditions.length === 0) return null;

    const matchedConditions: { name: string; advice: ConditionAdvice }[] = [];
    const unmatchedConditions: string[] = [];

    for (const condition of conditions) {
      const normalized = normalizeCondition(condition);
      if (normalized && CONDITION_ADVICE[normalized]) {
        // 중복 방지
        if (!matchedConditions.some(m => m.name === normalized)) {
          matchedConditions.push({ name: normalized, advice: CONDITION_ADVICE[normalized] });
        }
      } else {
        unmatchedConditions.push(condition);
      }
    }

    if (matchedConditions.length === 0) return null;

    // 피해야 할 음식 합치기 (중복 제거)
    const allAvoid = [...new Set(matchedConditions.flatMap(m => m.advice.avoid))];
    // 권장 음식 합치기 (중복 제거)
    const allRecommend = [...new Set(matchedConditions.flatMap(m => m.advice.recommend))];
    // 노트 합치기
    const allNotes = matchedConditions.map(m => m.advice.note);

    return {
      conditions: matchedConditions.map(m => m.name),
      avoid: allAvoid,
      recommend: allRecommend,
      notes: allNotes,
    };
  }, [conditions]);
  
  // 아무 추천도 없을 때
  if (recommendations.length === 0 && !conditionRecommendations) {
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
      
      {/* 영양소 기반 추천 */}
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

      {/* 지병 기반 추천 */}
      {conditionRecommendations && (
        <div className="rounded-2xl p-4 border bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-2 font-medium text-purple-600">
            <Heart className="w-4 h-4" />
            건강 상태 기반 추천
            <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full ml-auto">
              {conditionRecommendations.conditions.join(', ')}
            </span>
          </div>
          
          <div className="mt-3 space-y-3">
            {/* 피해야 할 음식 */}
            <div>
              <p className="text-sm font-medium text-red-600 mb-1">🚫 주의가 필요한 음식</p>
              <div className="flex flex-wrap gap-1">
                {conditionRecommendations.avoid.slice(0, 6).map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-red-500/10 text-red-700 border border-red-500/20 px-2 py-1 rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            
            {/* 권장 음식 */}
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-1">✅ 권장 음식</p>
              <div className="flex flex-wrap gap-1">
                {conditionRecommendations.recommend.slice(0, 6).map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-1 rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 노트 */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-purple-500/10">
              {conditionRecommendations.notes.slice(0, 2).map((note, idx) => (
                <p key={idx}>💡 {note}</p>
              ))}
            </div>
          </div>
          
          {/* 면책 조항 */}
          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-purple-500/10">
            ⚠️ 위 정보는 의학적 진단/치료를 대체하지 않으며 참고용입니다.
          </p>
        </div>
      )}
    </div>
  );
}
