import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NutritionData {
  meals: {
    mealType: string;
    foods: string[];
    calories: number;
  }[];
  totals: {
    totalCalories: number;
    totalCarbs: number;
    totalProtein: number;
    totalFat: number;
  };
  goals: {
    calorieGoal: number;
    carbGoalG: number;
    proteinGoalG: number;
    fatGoalG: number;
  };
}

interface UserProfile {
  age: number | null;
  heightCm: number | null;
  currentWeight: number | null;
  goalWeight: number | null;
  conditions: string[] | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { nutritionData, userProfile } = await req.json() as { 
      nutritionData: NutritionData;
      userProfile?: UserProfile;
    };

    // 식단 요약 생성
    const mealSummary = nutritionData.meals
      .map(m => `${m.mealType}: ${m.foods.join(", ")} (${m.calories}kcal)`)
      .join("\n");

    // 사용자 프로필 정보 구성
    const profileInfo = userProfile ? `
사용자 정보:
- 나이: ${userProfile.age || '미입력'}세
- 키: ${userProfile.heightCm || '미입력'}cm
- 현재 체중: ${userProfile.currentWeight || '미입력'}kg
- 목표 체중: ${userProfile.goalWeight || '미입력'}kg
- 건강 상태/지병: ${userProfile.conditions?.length ? userProfile.conditions.join(', ') : '없음'}
` : '';

    // 점수 일관성을 위한 결정적 점수 계산
    const calorieRatio = nutritionData.totals.totalCalories / nutritionData.goals.calorieGoal;
    const proteinRatio = nutritionData.totals.totalProtein / nutritionData.goals.proteinGoalG;
    const carbRatio = nutritionData.totals.totalCarbs / nutritionData.goals.carbGoalG;
    const fatRatio = nutritionData.totals.totalFat / nutritionData.goals.fatGoalG;
    
    // 기본 점수 계산 (목표 대비 달성률 기반, 100% 근접이 최고점)
    const calorieScore = Math.max(0, 100 - Math.abs(1 - calorieRatio) * 50);
    const proteinScore = Math.max(0, 100 - Math.abs(1 - proteinRatio) * 40);
    const carbScore = Math.max(0, 100 - Math.abs(1 - carbRatio) * 30);
    const fatScore = Math.max(0, 100 - Math.abs(1 - fatRatio) * 30);
    
    // 가중 평균 (칼로리 40%, 단백질 30%, 탄수화물 15%, 지방 15%)
    const calculatedScore = Math.round(
      calorieScore * 0.4 + proteinScore * 0.3 + carbScore * 0.15 + fatScore * 0.15
    );
    // 최소 30점, 최대 100점으로 제한
    const finalScore = Math.min(100, Math.max(30, calculatedScore));

const prompt = `당신은 따뜻하고 격려하는 전문 영양사입니다. 다음 하루 식단을 긍정적으로 평가해주세요. 잘한 점을 먼저 칭찬하고, 개선할 점은 부드럽게 조언해주세요.

${profileInfo}
오늘 식단:
${mealSummary}

영양 섭취:
- 총 칼로리: ${nutritionData.totals.totalCalories}kcal (목표: ${nutritionData.goals.calorieGoal}kcal)
- 탄수화물: ${nutritionData.totals.totalCarbs}g (목표: ${nutritionData.goals.carbGoalG}g)
- 단백질: ${nutritionData.totals.totalProtein}g (목표: ${nutritionData.goals.proteinGoalG}g)
- 지방: ${nutritionData.totals.totalFat}g (목표: ${nutritionData.goals.fatGoalG}g)

※ 중요: 점수는 반드시 ${finalScore}점으로 고정해주세요.

다음 JSON 형식으로 응답해주세요. 반드시 한국어로 작성하세요:
{
  "score": ${finalScore},
  "summary": "한 줄 종합 평가 (15자 내외, 긍정적 톤)",
  "harshEvaluation": "종합 평가 3~4문장 이내(총 80자 내외). 잘한 점을 먼저 언급하고, 개선할 점은 응원하는 톤으로 간결하게 제안",
  "balanceEvaluation": "탄단지 균형에 대한 평가 (2~3문장, 60자 내외, 격려하는 톤으로 간결하게)",
  "improvements": ["개선할 점 1 (부드러운 제안, 20자 내외)", "개선할 점 2", "개선할 점 3"],
  "recommendedFoods": ["내일 추천하는 음식 1", "음식 2", "음식 3"],
  "cautionFoods": ["섭취를 줄이면 좋을 음식 1", "음식 2"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: '당신은 따뜻하고 격려하는 전문 영양사입니다. 사용자의 건강 상태와 목표를 고려하여 응원하는 피드백을 제공합니다. 잘한 점을 먼저 칭찬하고 개선점은 부드럽게 조언합니다. 항상 JSON 형식으로 응답합니다. 한국어로 응답합니다. 문장은 간결하게, 각 평가는 3~4문장 이내로 작성합니다.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('AI 응답을 받지 못했습니다');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('피드백 형식 오류');
    }

    const feedback = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in diet-feedback function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
