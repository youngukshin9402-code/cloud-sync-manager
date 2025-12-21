import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 건강 나이 분석 함수
async function analyzeHealthAgeFromData(inbodyData: {
  weight: number;
  skeletal_muscle: number | null;
  body_fat_percent: number | null;
  body_fat: number | null;
  bmr: number | null;
  visceral_fat: number | null;
  date: string;
}): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI 서비스가 설정되지 않았습니다" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Analyzing health age from InBody data:", inbodyData);

  const prompt = `당신은 건강 전문가입니다. 다음 인바디(체성분) 데이터를 기반으로 사용자의 건강 나이와 신체 점수를 평가해주세요.

인바디 데이터:
- 체중: ${inbodyData.weight}kg
- 골격근량: ${inbodyData.skeletal_muscle ? inbodyData.skeletal_muscle + 'kg' : '측정 안됨'}
- 체지방률: ${inbodyData.body_fat_percent ? inbodyData.body_fat_percent + '%' : '측정 안됨'}
- 체지방량: ${inbodyData.body_fat ? inbodyData.body_fat + 'kg' : '측정 안됨'}
- 기초대사량: ${inbodyData.bmr ? inbodyData.bmr + 'kcal' : '측정 안됨'}
- 내장지방 레벨: ${inbodyData.visceral_fat ?? '측정 안됨'}

다음 형식의 JSON으로만 응답하세요:
{
  "healthAge": 추정 건강 나이(숫자),
  "bodyScore": 신체 점수(1-100점 사이 숫자),
  "analysis": "간단한 분석 및 조언 (2-3문장)"
}

건강 나이 계산 기준:
- 체지방률이 낮고 골격근량이 높으면 건강 나이가 낮아짐
- 내장지방 레벨이 높으면 건강 나이가 높아짐
- 기초대사량이 높으면 신체 점수가 높아짐

신체 점수 기준:
- 80-100점: 매우 우수
- 60-79점: 양호
- 40-59점: 보통
- 40점 미만: 개선 필요`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 크레딧이 부족합니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI 분석 중 오류가 발생했습니다");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI 응답이 비어있습니다");
    }

    console.log("Health age AI response:", content);

    // Parse JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const parsedData = JSON.parse(jsonContent.trim());

    return new Response(
      JSON.stringify({
        success: true,
        healthAge: parsedData.healthAge,
        bodyScore: parsedData.bodyScore,
        analysis: parsedData.analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Health age analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "분석 실패" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageBase64, analyzeHealthAge, inbodyData } = body;

    // 건강 나이 분석 모드
    if (analyzeHealthAge && inbodyData) {
      return await analyzeHealthAgeFromData(inbodyData);
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "이미지가 필요합니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI 서비스가 설정되지 않았습니다" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing InBody image with AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `당신은 인바디(InBody) 체성분 분석 결과지를 읽고 데이터를 추출하는 전문가입니다.

중요: 어떤 이미지가 주어지더라도 반드시 JSON 형식으로만 응답해야 합니다. 설명이나 다른 텍스트는 절대 포함하지 마세요.

인바디 결과지가 아닌 경우: {"error": "not_inbody", "message": "인바디 결과지가 아닙니다"}

인바디 결과지인 경우 다음 정보를 추출하세요:
- 측정일자 (date): YYYY-MM-DD 형식
- 체중 (weight): kg 단위 숫자
- 골격근량 (skeletal_muscle): kg 단위 숫자
- 체지방률 (body_fat_percent): % 숫자
- 기초대사량 (bmr): kcal 숫자
- 체지방량 (body_fat): kg 단위 숫자 (있는 경우)
- 내장지방 레벨 (visceral_fat): 숫자 (있는 경우)

값을 찾을 수 없는 경우 null을 반환하세요.
예시: {"date":"2024-01-15","weight":65.5,"skeletal_muscle":28.3,"body_fat_percent":18.5,"bmr":1450,"body_fat":12.1,"visceral_fat":8}

반드시 유효한 JSON만 출력하세요. 마크다운 코드 블록 없이 순수 JSON만 응답하세요.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "이 이미지를 분석해주세요. 반드시 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력하세요."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 크레딧이 부족합니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI 분석 중 오류가 발생했습니다" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "AI 응답이 비어있습니다" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response:", content);

    // Try to extract JSON from the response
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in the response
    const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonContent = jsonObjectMatch[0];
    }

    try {
      const parsedData = JSON.parse(jsonContent);
      
      // Check if it's a not_inbody error response
      if (parsedData.error === "not_inbody") {
        console.log("Image is not an InBody result:", parsedData.message);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: parsedData.message || "인바디 결과지가 아닙니다. 올바른 인바디 결과지 이미지를 업로드해주세요." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Validate and sanitize the data
      const result = {
        date: parsedData.date || new Date().toISOString().split('T')[0],
        weight: typeof parsedData.weight === 'number' ? parsedData.weight : null,
        skeletal_muscle: typeof parsedData.skeletal_muscle === 'number' ? parsedData.skeletal_muscle : null,
        body_fat_percent: typeof parsedData.body_fat_percent === 'number' ? parsedData.body_fat_percent : null,
        bmr: typeof parsedData.bmr === 'number' ? parsedData.bmr : null,
        body_fat: typeof parsedData.body_fat === 'number' ? parsedData.body_fat : null,
        visceral_fat: typeof parsedData.visceral_fat === 'number' ? parsedData.visceral_fat : null,
      };
      
      // Check if we got any meaningful data
      const hasData = result.weight !== null || result.skeletal_muscle !== null || result.body_fat_percent !== null;
      if (!hasData) {
        console.log("No meaningful InBody data extracted");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "인바디 데이터를 추출할 수 없습니다. 인바디 결과지 이미지인지 확인해주세요." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Parsed InBody data:", result);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", jsonContent);
      
      // Check if the response indicates it's not an InBody result
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes("인바디") && (lowerContent.includes("아닙니다") || lowerContent.includes("없습니다"))) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "인바디 결과지가 아닙니다. 올바른 인바디 결과지 이미지를 업로드해주세요." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "이미지를 분석할 수 없습니다. 인바디 결과지 이미지를 업로드해주세요." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in analyze-inbody:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});