import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealRecord {
  date: string;
  meal_type: string;
  foods: { name: string; calories: number; protein?: number; carbs?: number; fat?: number }[];
  total_calories: number;
}

interface UserProfile {
  age: number | null;
  heightCm: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  conditions: string[];
}

interface Goals {
  calorieGoal: number;
  proteinGoalG: number;
  carbGoalG: number;
  fatGoalG: number;
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

    const { mealRecords, userProfile, goals } = await req.json() as {
      mealRecords: MealRecord[];
      userProfile: UserProfile;
      goals: Goals;
    };

    console.log(`[weekly-diet-report] Analyzing ${mealRecords.length} meal records`);

    // 주간 식단 요약 생성
    const mealsByDay: Record<string, MealRecord[]> = {};
    mealRecords.forEach(record => {
      if (!mealsByDay[record.date]) mealsByDay[record.date] = [];
      mealsByDay[record.date].push(record);
    });

    const daySummaries = Object.entries(mealsByDay).map(([date, meals]) => {
      const totalCal = meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
      const foodList = meals.flatMap(m => m.foods.map(f => f.name)).join(", ");
      return `${date}: ${totalCal}kcal (${foodList})`;
    }).join("\n");

    // 사용자 프로필 요약
    const profileSummary = [
      userProfile.age ? `나이: ${userProfile.age}세` : null,
      userProfile.heightCm ? `키: ${userProfile.heightCm}cm` : null,
      userProfile.currentWeight ? `현재 체중: ${userProfile.currentWeight}kg` : null,
      userProfile.targetWeight ? `목표 체중: ${userProfile.targetWeight}kg` : null,
      userProfile.conditions?.length ? `지병/건강상태: ${userProfile.conditions.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    const prompt = `당신은 엄격하고 전문적인 영양사입니다. 다음 주간 식단을 분석하고 냉정하게 평가해주세요.

사용자 정보:
${profileSummary || "정보 없음"}

목표:
- 칼로리: ${goals.calorieGoal}kcal/일
- 단백질: ${goals.proteinGoalG}g/일
- 탄수화물: ${goals.carbGoalG}g/일
- 지방: ${goals.fatGoalG}g/일

이번 주 식단:
${daySummaries}

다음 JSON 형식으로 응답해주세요. 반드시 한국어로 작성하고, 냉정하지만 건설적인 톤을 사용하세요:
{
  "score": 0~100 (주간 식단 점수, 목표 대비 실제 달성률 + 균형 + 건강상태 반영),
  "summary": "한 줄 총평 (냉정하게, 20~30자)",
  "strengths": ["잘한 점 1", "잘한 점 2", "잘한 점 3"],
  "improvements": ["개선할 점 1", "개선할 점 2", "개선할 점 3"],
  "nextWeekActions": ["다음 주 구체적 행동 1", "다음 주 구체적 행동 2"],
  "healthNotes": ["지병/목표 기반 주의사항 1", "주의사항 2"]
}

주의:
- 사용자의 지병/건강상태가 있다면 반드시 healthNotes에 관련 주의사항을 포함하세요
- 목표 체중이 현재보다 낮으면 체중 감량 관점에서 평가하세요
- 점수는 실제 달성률을 냉정하게 반영하세요 (목표 미달이면 60점 이하)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: '당신은 엄격하고 전문적인 영양사입니다. 항상 JSON 형식으로 응답합니다. 한국어로 응답합니다.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[weekly-diet-report] AI API error:', errorText);
      throw new Error('AI 응답을 받지 못했습니다');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('[weekly-diet-report] AI response received');

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[weekly-diet-report] No JSON found in response:', content);
      throw new Error('리포트 형식 오류');
    }

    const report = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[weekly-diet-report] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
