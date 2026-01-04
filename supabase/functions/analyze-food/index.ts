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
    const { imageUrl, imagePath, userId, healthTags, foodName, grams, unit, portion } = body;
    
    console.log("Analyze food request:", { imagePath, imageUrl, foodName, grams, unit, portion, userId });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // === 텍스트 기반 분석 (직접 입력) ===
    if (foodName && !imageUrl && !imagePath) {
      console.log("Text-based food analysis for:", foodName);
      
      // 양 결정: 중량(g) 우선, 그 다음 unit, 그 다음 portion(레거시)
      let quantityText = "";
      if (grams) {
        quantityText = `정확히 ${grams}g`;
      } else if (unit) {
        quantityText = `${unit}`;
      } else if (portion) {
        quantityText = `${portion}인분 (약 ${Math.round(portion * 200)}g 추정)`;
      } else {
        quantityText = "1인분 (약 200g 추정)";
      }

      const textPrompt = `당신은 한국 음식과 전 세계 음식에 대한 최고의 영양 분석 전문가입니다.
다음 음식의 영양정보를 매우 정확하고 꼼꼼하게 분석해주세요.

음식: ${foodName}
양: ${quantityText}

## 핵심 분석 지침:

### 1. 브랜드/프랜차이즈 음식
- 스타벅스, 투썸플레이스, 이디야, 할리스 등 카페 메뉴는 실제 영양정보 기준
- 맥도날드, 버거킹, 롯데리아, KFC 등 패스트푸드는 실제 메뉴 영양정보 기준
- 교촌, 굽네, BBQ, BHC 등 치킨 프랜차이즈는 실제 메뉴 영양정보 기준
- 편의점(CU, GS25, 세븐일레븐, 이마트24) 제품은 실제 제품 영양정보 기준

### 2. 건강식품/보충제
- 마이프로틴, 옵티멈뉴트리션 등 프로틴 제품은 제품 영양정보 기준
- 퀵오트밀, 오버나이트오츠 등은 제품 영양정보 기준
- 그릭요거트(풀무원, 빙그레 등)는 제품 영양정보 기준
- 스키피, 땅콩버터 등은 제품 영양정보 기준

### 3. 한국 전통 음식
- 김치찌개, 된장찌개, 비빔밥, 불고기, 삼겹살 등은 한국 일반적인 1인분 기준
- 국밥, 설렁탕, 갈비탕 등 탕류는 일반적인 1그릇 기준
- 분식(떡볶이, 순대, 튀김 등)은 일반적인 1인분 기준

### 4. 과자/스낵류
- 코스모스 제과, 농심, 오리온, 롯데제과 등 과자는 제품 영양정보 기준
- 1봉지, 1개 단위로 정확히 계산

### 5. 단위 해석 규칙
- "2개", "2컵", "2그릇", "2봉지" 등 → 해당 단위의 일반적인 양 × 2
- "반개", "0.5개" → 해당 단위의 일반적인 양 × 0.5
- 숫자만 입력 시 (예: "2") → 2인분으로 해석

### 6. 모르는 음식 처리
- 정확한 정보가 없으면 비슷한 음식 카테고리로 합리적으로 추정
- 추정 시에도 칼로리, 탄수화물, 단백질, 지방을 최대한 정확하게

## 응답 형식 (JSON만 출력):
{
  "name": "${foodName}",
  "calories": 숫자 (kcal, 정수),
  "carbs": 숫자 (g, 정수),
  "protein": 숫자 (g, 정수),
  "fat": 숫자 (g, 정수)
}

주의: JSON만 출력하고 다른 설명은 포함하지 마세요.`;

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
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 숫자 변환 및 검증
        result = {
          name: parsed.name || foodName,
          calories: Math.round(Number(parsed.calories) || 200),
          carbs: Math.round(Number(parsed.carbs) || 25),
          protein: Math.round(Number(parsed.protein) || 10),
          fat: Math.round(Number(parsed.fat) || 8),
        };
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        // 기본값 제공
        const baseGrams = grams || 200;
        result = {
          name: foodName,
          calories: Math.round(baseGrams * 1.5),
          carbs: Math.round(baseGrams * 0.3),
          protein: Math.round(baseGrams * 0.1),
          fat: Math.round(baseGrams * 0.08),
        };
      }

      console.log("Final text result:", result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 이미지 기반 분석 ===
    if (!imageUrl && !imagePath) {
      return new Response(
        JSON.stringify({ error: "imageUrl, imagePath, or foodName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Image-based food analysis");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine the storage path
    let storagePath = imagePath;
    if (!storagePath && imageUrl) {
      // Fallback: extract path from URL (supports both public and signed URLs)
      const urlPatterns = [
        `${supabaseUrl}/storage/v1/object/public/food-logs/`,
        `${supabaseUrl}/storage/v1/object/sign/food-logs/`,
        `/storage/v1/object/public/food-logs/`,
        `/storage/v1/object/sign/food-logs/`,
      ];
      for (const pattern of urlPatterns) {
        if (imageUrl.includes(pattern)) {
          storagePath = imageUrl.split(pattern)[1]?.split("?")[0];
          break;
        }
      }
      if (!storagePath) {
        // Try to extract any path after food-logs/
        const match = imageUrl.match(/food-logs\/([^?]+)/);
        storagePath = match ? match[1] : null;
      }
    }

    if (!storagePath) {
      console.error("Could not determine storage path from:", { imagePath, imageUrl });
      return new Response(
        JSON.stringify({ error: "invalid_image_path", notes: "이미지 경로를 확인할 수 없습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Downloading image from storage path:", storagePath);

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from("food-logs")
      .download(storagePath);

    if (downloadError) {
      console.error("Error downloading image:", downloadError, "path:", storagePath);
      return new Response(
        JSON.stringify({ error: "download_failed", notes: "이미지를 다운로드할 수 없습니다. 다시 시도해주세요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to base64 using chunked approach
    const imageBytes = await imageData.arrayBuffer();
    const fileSizeKB = Math.round(imageBytes.byteLength / 1024);
    console.log("Image downloaded successfully:", { sizeKB: fileSizeKB, mimeType: imageData.type });
    
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

    // 시스템 프롬프트: 영양 분석 전문가 AI 역할 정의
    const systemPrompt = `너는 음식 사진을 분석하는 영양 분석 전문가 AI다.
사용자가 업로드한 음식 사진을 보고,
사진 속 음식의 종류와 구성 요소를 추정하여
일반적인 1인분 기준으로 영양 정보를 제공해야 한다.

다음 규칙을 반드시 지켜라:

1. 음식 인식
- 사진에서 보이는 음식을 가능한 한 구체적으로 식별한다.
  (예: "비빔밥", "제육볶음", "닭가슴살 샐러드", "라면" 등)
- 여러 음식이 보일 경우, 각각을 분리해서 인식한다.
- 단일 재료라도 음식이면 반드시 음식으로 인식한다.
  (예: 흰쌀밥/현미밥, 계란후라이, 삶은 계란, 바나나, 우유, 두부 등)
- 정확히 알 수 없는 경우에도 가능한 최선의 추정을 제공한다:
  - "○○로 보이는 음식"처럼 추정임을 표시하고 confidence를 "낮음"으로 둔다.

2. 양(분량) 추정
- 일반적인 1인분 기준으로 추정한다.
- 접시/그릇/포장 크기를 참고해 과도하지 않게 추정한다.
- 분량을 알 수 없으면 "보통 1인분 기준 추정"이라고 명시한다.

3. 영양 정보 산출
- 각 음식에 대해 다음 항목을 추정해 제공한다:
  - 칼로리(kcal)
  - 탄수화물(g)
  - 단백질(g)
  - 지방(g)
- 정확한 수치가 아니라 현실적인 범위의 추정값을 제시한다.

4. 톤 & 주의사항
- 사용자에게 단정적으로 말하지 않는다.
- 의료적/진단적 표현은 사용하지 않는다.
- '추정', '일반적인 기준'이라는 표현을 유지한다.

5. 음식이 아닌 사진 처리 (매우 중요!)
- 음식이 전혀 없다고 확신할 수 있는 경우에만 foods를 빈 배열 []로 반환한다.
  (예: 사람/풍경/문서/기기/옷/가구/빈 책상/완전한 빈 접시 등)
- 음식처럼 보이는 어떤 요소라도 있으면(그릇+내용물/식재료/조리 흔적 등)
  절대 빈 배열을 반환하지 말고, 최소 1개 이상의 추정 항목을 제공한다.
- 물/얼음물/생수만 단독으로 있는 사진은 음식이 아닌 것으로 처리한다.`;


    // 사용자 프롬프트: 분석 요청 및 출력 형식
    const userPrompt = `이 음식 사진을 분석해주세요.

${healthContext ? `사용자 건강 상태: ${healthTags.join(", ")}` : ""}

결과는 반드시 다음 JSON 형식으로만 반환해주세요:
{
  "foods": [
    {
      "name": "음식 이름 (한국어)",
      "estimated_portion": "1인분",
      "calories_kcal": 숫자,
      "carbohydrates_g": 숫자,
      "protein_g": 숫자,
      "fat_g": 숫자,
      "confidence": "높음/중간/낮음"
    }
  ],
  "notes": "사진 기준으로 추정된 값이며 실제 섭취량과 차이가 있을 수 있습니다."
}

중요:
- 여러 음식이 보이면 foods 배열에 각각 추가해주세요.
- 음식처럼 보이는 것이 조금이라도 있으면 반드시 최소 1개 이상의 음식을 추정해서 foods에 포함하세요.
- 확실하지 않아도 "~로 보이는 음식"처럼 추정값을 제공하고 confidence를 "낮음"으로 설정하세요.
- JSON만 출력하고 다른 설명은 포함하지 마세요.`;

    // AI 분석 함수 (재시도 지원)
    const callAIForAnalysis = async (prompt: string, isRetry = false): Promise<Response> => {
      console.log(`Calling Lovable AI (Gemini 2.5 Pro vision)${isRetry ? " - RETRY" : ""}...`);
      
      return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
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
    };

    // 재시도용 강화 프롬프트
    const retryPrompt = `이것은 음식 사진입니다. 사진에서 보이는 모든 음식이나 식재료를 반드시 인식해주세요.

그릇, 접시, 용기에 담긴 것이 있다면 무조건 음식으로 간주하세요.
확실하지 않더라도 "~로 보이는 음식"처럼 추정해서 반드시 결과를 제공하세요.

결과는 반드시 다음 JSON 형식으로만 반환해주세요:
{
  "foods": [
    {
      "name": "음식 이름 (한국어)",
      "estimated_portion": "1인분",
      "calories_kcal": 숫자,
      "carbohydrates_g": 숫자,
      "protein_g": 숫자,
      "fat_g": 숫자,
      "confidence": "낮음"
    }
  ],
  "notes": "추정값입니다."
}

JSON만 출력하세요.`;

    let aiResponse = await callAIForAnalysis(userPrompt);


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

    // Parse JSON from response - 새로운 foods 배열 형식 처리
    let analysisResult: FoodAnalysisResult | FoodAnalysisResult[] | { error: string; notes: string };
    let needsRetry = false;
    let parsed: any = null;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
      
      // 새 형식: foods 배열이 있는 경우
      if (parsed.foods && Array.isArray(parsed.foods)) {
        console.log("Foods detected:", parsed.foods.length);
        
        // 빈 배열인 경우 - 재시도 필요
        if (parsed.foods.length === 0) {
          console.log("No food detected in first attempt, will retry...");
          needsRetry = true;
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response (first attempt):", parseError);
      needsRetry = true;
    }

    // 재시도 로직: 빈 배열이거나 파싱 실패 시 강화 프롬프트로 재시도
    if (needsRetry) {
      console.log("Retrying with enhanced prompt...");
      const retryResponse = await callAIForAnalysis(retryPrompt, true);
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryContent = retryData.choices?.[0]?.message?.content;
        
        if (retryContent) {
          console.log("Retry AI response:", retryContent);
          try {
            const retryJsonMatch = retryContent.match(/\{[\s\S]*\}/);
            if (retryJsonMatch) {
              parsed = JSON.parse(retryJsonMatch[0]);
              if (parsed.foods && Array.isArray(parsed.foods) && parsed.foods.length > 0) {
                console.log("Retry successful, foods detected:", parsed.foods.length);
                needsRetry = false;
              }
            }
          } catch (retryParseError) {
            console.error("Retry parse failed:", retryParseError);
          }
        }
      }
      
      // 재시도도 실패한 경우
      if (needsRetry || !parsed?.foods?.length) {
        console.log("Both attempts failed - no food detected");
        return new Response(
          JSON.stringify({ 
            error: "no_food_detected", 
            notes: "음식을 인식할 수 없습니다. 조명이나 각도를 조정해서 다시 촬영해주세요." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 결과 처리
    if (parsed?.foods && Array.isArray(parsed.foods)) {
      // 여러 음식인 경우 배열로 반환
      if (parsed.foods.length > 1) {
        analysisResult = parsed.foods.map((food: any) => ({
          name: food.name || "알 수 없는 음식",
          calories: Math.round(Number(food.calories_kcal) || 300),
          carbs: Math.round(Number(food.carbohydrates_g) || 30),
          protein: Math.round(Number(food.protein_g) || 15),
          fat: Math.round(Number(food.fat_g) || 10),
          estimated_portion: food.estimated_portion || "1인분",
          confidence: food.confidence || "중간",
          notes: parsed.notes || "사진 기준으로 추정된 값입니다.",
        }));
      } else {
        // 단일 음식
        const food = parsed.foods[0];
        analysisResult = {
          name: food.name || "알 수 없는 음식",
          calories: Math.round(Number(food.calories_kcal) || 300),
          carbs: Math.round(Number(food.carbohydrates_g) || 30),
          protein: Math.round(Number(food.protein_g) || 15),
          fat: Math.round(Number(food.fat_g) || 10),
          feedback: parsed.notes || "사진 기준으로 추정된 값입니다.",
        };
      }
    } else if (parsed) {
      // 레거시 형식 (기존 단일 음식 형식)
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
    } else {
      // 파싱 결과 없음
      return new Response(
        JSON.stringify({ 
          error: "parse_error", 
          notes: "AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
