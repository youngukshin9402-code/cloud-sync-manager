import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FoodAnalysisResult {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  nutrition_score?: number;
  feedback?: string;
  nutrients?: { name: string; amount: string; unit: string }[];
  recommendations?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageUrl, userId, healthTags, foodName, grams, portion } = body;
    
    console.log("Analyze food request:", { imageUrl, foodName, grams, portion });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // === 텍스트 기반 분석 (직접 입력) ===
    if (foodName && !imageUrl) {
      console.log("Text-based food analysis for:", foodName);
      
      // 양 결정 (인분 또는 그램)
      let quantityText = "";
      if (grams) {
        quantityText = `${grams}g`;
      } else if (portion) {
        quantityText = `${portion}인분 (약 ${Math.round(portion * 200)}g 추정)`;
      } else {
        quantityText = "1인분 (약 200g 추정)";
      }

      const textPrompt = `당신은 영양 분석 전문가입니다. 다음 음식의 영양정보를 냉철하게 분석해주세요.

음식: ${foodName}
양: ${quantityText}

다음 JSON 형식으로 정확한 영양정보를 응답해주세요:
{
  "name": "${foodName}",
  "calories": 숫자 (kcal),
  "carbs": 숫자 (g),
  "protein": 숫자 (g),
  "fat": 숫자 (g)
}

주의사항:
- 한국 음식 기준으로 현실적인 수치를 제공하세요
- 과대평가하지 말고 냉철하게 계산하세요
- JSON만 응답하고 다른 텍스트는 포함하지 마세요`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: textPrompt }],
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
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in AI response");
      }

      console.log("AI text response:", content);

      let result: FoodAnalysisResult;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        result = JSON.parse(jsonMatch[0]);
      } catch {
        // 기본값 제공
        const baseGrams = grams || (portion ? portion * 200 : 200);
        result = {
          name: foodName,
          calories: Math.round(baseGrams * 1.5),
          carbs: Math.round(baseGrams * 0.3),
          protein: Math.round(baseGrams * 0.1),
          fat: Math.round(baseGrams * 0.08),
        };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 이미지 기반 분석 ===
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl or foodName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Image-based food analysis");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download image from storage
    const imagePath = imageUrl.replace(`${supabaseUrl}/storage/v1/object/public/food-logs/`, "");
    const { data: imageData, error: downloadError } = await supabase.storage
      .from("food-logs")
      .download(imagePath);

    if (downloadError) {
      console.error("Error downloading image:", downloadError);
      throw new Error("Failed to download image");
    }

    // Convert to base64 using chunked approach
    const imageBytes = await imageData.arrayBuffer();
    const uint8Array = new Uint8Array(imageBytes);
    let binaryString = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Image = btoa(binaryString);
    const mimeType = imageData.type || "image/jpeg";

    // Build health context
    const healthContext = healthTags && healthTags.length > 0
      ? `사용자의 건강 상태: ${healthTags.join(", ")}. 이를 고려해 맞춤 피드백을 제공해주세요.`
      : "";

    const prompt = `당신은 영양 분석 전문가입니다. 이 음식 사진을 분석해주세요.

${healthContext}

다음 JSON 형식으로 응답해주세요:
{
  "name": "음식 이름 (한국어)",
  "calories": 예상 칼로리 (숫자만),
  "nutrition_score": 영양 점수 1-100 사이 (숫자만, 100이 가장 건강함),
  "feedback": "이 음식에 대한 짧은 피드백 (50자 이내, 친근하고 따뜻한 어투)",
  "nutrients": [
    {"name": "탄수화물", "amount": "약 30", "unit": "g"},
    {"name": "단백질", "amount": "약 15", "unit": "g"},
    {"name": "지방", "amount": "약 10", "unit": "g"},
    {"name": "식이섬유", "amount": "약 3", "unit": "g"},
    {"name": "나트륨", "amount": "약 500", "unit": "mg"}
  ],
  "recommendations": ["맞춤 식단 추천 1", "맞춤 식단 추천 2"]
}

건강 태그별 맞춤 피드백:
- high_bp (고혈압): 저염식 권장, 나트륨 주의
- diabetes (당뇨): 저당, 저탄수화물 권장
- obesity (비만): 저칼로리, 고단백 권장
- anemia (빈혈): 철분 풍부한 음식 권장

JSON만 응답하고 다른 텍스트는 포함하지 마세요.`;

    console.log("Calling Lovable AI for food image analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
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

    console.log("AI image response:", content);

    // Parse JSON from response
    let analysisResult: FoodAnalysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]);
      
      // nutrients에서 carbs, protein, fat 추출
      const nutrients = parsed.nutrients || [];
      const carbsNutrient = nutrients.find((n: any) => n.name === "탄수화물");
      const proteinNutrient = nutrients.find((n: any) => n.name === "단백질");
      const fatNutrient = nutrients.find((n: any) => n.name === "지방");

      analysisResult = {
        ...parsed,
        carbs: carbsNutrient ? parseInt(carbsNutrient.amount.replace(/[^0-9]/g, "")) || 30 : 30,
        protein: proteinNutrient ? parseInt(proteinNutrient.amount.replace(/[^0-9]/g, "")) || 15 : 15,
        fat: fatNutrient ? parseInt(fatNutrient.amount.replace(/[^0-9]/g, "")) || 10 : 10,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisResult = {
        name: "음식",
        calories: 300,
        carbs: 30,
        protein: 15,
        fat: 10,
        nutrition_score: 70,
        feedback: "맛있게 드세요! 🍽️",
        nutrients: [
          { name: "탄수화물", amount: "약 30", unit: "g" },
          { name: "단백질", amount: "약 15", unit: "g" },
          { name: "지방", amount: "약 10", unit: "g" },
        ],
        recommendations: ["균형 잡힌 식사를 유지하세요"],
      };
    }

    console.log("Analysis result:", analysisResult);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-food function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});