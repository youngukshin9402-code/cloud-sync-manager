import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

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
사용자가 제공한 인바디 결과지 이미지에서 다음 정보를 정확하게 추출하세요:
- 측정일자 (date): YYYY-MM-DD 형식
- 체중 (weight): kg 단위 숫자
- 골격근량 (skeletal_muscle): kg 단위 숫자
- 체지방률 (body_fat_percent): % 숫자
- 기초대사량 (bmr): kcal 숫자
- 체지방량 (body_fat): kg 단위 숫자 (있는 경우)
- 내장지방 레벨 (visceral_fat): 숫자 (있는 경우)

반드시 JSON 형식으로만 응답하세요. 값을 찾을 수 없는 경우 null을 반환하세요.
예시: {"date":"2024-01-15","weight":65.5,"skeletal_muscle":28.3,"body_fat_percent":18.5,"bmr":1450,"body_fat":12.1,"visceral_fat":8}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "이 인바디 결과지 이미지에서 체성분 데이터를 추출해주세요. JSON 형식으로만 응답하세요."
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

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    try {
      const parsedData = JSON.parse(jsonContent.trim());
      
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

      console.log("Parsed InBody data:", result);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", jsonContent);
      return new Response(
        JSON.stringify({ error: "AI 응답을 파싱할 수 없습니다. 다시 시도해주세요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in analyze-inbody:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});