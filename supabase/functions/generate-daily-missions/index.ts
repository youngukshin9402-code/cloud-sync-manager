import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Mission {
  content: string;
  points: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, healthTags } = await req.json();

    console.log("Generating daily missions for user:", userId);
    console.log("Health tags:", healthTags);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if missions already exist for today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingMissions } = await supabase
      .from("mission_templates")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);

    if (existingMissions && existingMissions.length > 0) {
      console.log("Missions already exist for today");
      return new Response(
        JSON.stringify({ missions: existingMissions, isNew: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build health context for personalized missions
    const healthContext = healthTags && healthTags.length > 0
      ? `사용자의 건강 상태: ${healthTags.join(", ")}. 이 상태에 적합한 운동을 추천해주세요.`
      : "";

    const prompt = `당신은 건강 코치입니다. 시니어(50-60대)를 위한 오늘의 건강 미션 3개를 추천해주세요.

${healthContext}

다음 JSON 형식으로 응답해주세요:
{
  "missions": [
    {"content": "미션 내용 (구체적이고 실천 가능하게)", "points": 10},
    {"content": "미션 내용", "points": 10},
    {"content": "미션 내용", "points": 10}
  ]
}

미션 작성 가이드:
- 시니어가 쉽게 할 수 있는 가벼운 운동
- 구체적인 시간이나 횟수 포함 (예: "10분", "10회")
- 실내에서도 할 수 있는 활동 포함
- 친근하고 격려하는 어투

건강 태그별 추천:
- high_bp (고혈압): 가벼운 유산소, 스트레칭, 심호흡
- diabetes (당뇨): 식후 산책, 가벼운 유산소
- obesity (비만): 걷기, 가벼운 근력 운동
- anemia (빈혈): 가벼운 스트레칭, 충분한 휴식

JSON만 응답하고 다른 텍스트는 포함하지 마세요.`;

    console.log("Calling Lovable AI for mission generation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "서비스 이용 한도에 도달했습니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response:", content);

    // Parse JSON from response
    let missions: Mission[];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]);
      missions = parsed.missions;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Provide default missions if parsing fails
      missions = [
        { content: "아침 스트레칭 10분", points: 10 },
        { content: "물 8잔 마시기", points: 10 },
        { content: "저녁 산책 30분", points: 10 },
      ];
    }

    // Save missions to database
    const missionInserts = missions.map((m) => ({
      user_id: userId,
      content: m.content,
      points: m.points,
      is_active: true,
    }));

    const { data: savedMissions, error: insertError } = await supabase
      .from("mission_templates")
      .insert(missionInserts)
      .select();

    if (insertError) {
      console.error("Error saving missions:", insertError);
      throw new Error("Failed to save missions");
    }

    console.log("Missions saved successfully:", savedMissions);

    return new Response(
      JSON.stringify({ missions: savedMissions, isNew: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-daily-missions function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
