import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordId, imageUrls } = await req.json();
    
    if (!recordId || !imageUrls || imageUrls.length === 0) {
      throw new Error("recordId and imageUrls are required");
    }

    console.log(`Analyzing health checkup for record: ${recordId}`);
    console.log(`Image URLs: ${imageUrls.join(", ")}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to analyzing
    await supabase
      .from("health_records")
      .update({ status: "analyzing" })
      .eq("id", recordId);

    // Helper function to convert ArrayBuffer to base64 without stack overflow
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      return btoa(binary);
    };

    // Download images and convert to base64 with correct MIME type
    const imageContents = await Promise.all(
      imageUrls.map(async (url: string) => {
        const { data, error } = await supabase.storage
          .from("health-checkups")
          .download(url);
        
        if (error) {
          console.error(`Error downloading image: ${error.message}`);
          return null;
        }
        
        const arrayBuffer = await data.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        // Blob의 실제 type을 사용, 없으면 파일 확장자로 추정
        const mimeType = data.type || (url.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
        return `data:${mimeType};base64,${base64}`;
      })
    );

    const validImages = imageContents.filter(Boolean);
    
    if (validImages.length === 0) {
      throw new Error("No valid images to analyze");
    }

    // Prepare messages for AI analysis - is_health_checkup 필드 강제 + JSON only
    const userContent: any[] = [
      {
        type: "text",
        text: `당신은 건강검진 결과를 쉬운 말로 설명해주는 AI입니다.

다음 이미지를 분석해주세요.

**중요: 반드시 아래 JSON 형식만 출력하세요. 설명, 마크다운, 코드블럭 없이 순수 JSON만 출력해야 합니다.**

{
  "is_health_checkup": true 또는 false (이 이미지가 건강검진/혈액검사/건강검진결과지인지 여부),
  "health_age": 숫자 또는 null,
  "summary": "2~3줄 핵심 요약",
  "items": [
    {
      "name": "검사 항목명",
      "value": "측정값",
      "unit": "단위",
      "status": "normal" 또는 "warning" 또는 "danger",
      "description": "한 줄 설명"
    }
  ],
  "health_tags": ["해당 태그들"],
  "recommendations": ["생활 조언 2~3개"]
}

**규칙:**
1. is_health_checkup: 건강검진 결과지가 아니면 false, 맞으면 true
2. 건강검진 결과지가 아닐 경우: is_health_checkup=false, items=[], summary="이 이미지는 건강검진 결과지가 아닙니다"
3. 건강검진 결과지일 경우: 이상 있는 항목 우선, 최대 8개
4. description은 한 줄, 쉬운 말로
5. 마크다운 코드블럭(\`\`\`) 사용 금지, 순수 JSON만 출력`,
      },
    ];

    // Add images to the request
    validImages.forEach((imageData) => {
      userContent.push({
        type: "image_url",
        image_url: { url: imageData },
      });
    });

    console.log("Sending request to Lovable AI...");

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
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        throw new Error("AI 서비스가 일시적으로 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.");
      }
      if (response.status === 402) {
        throw new Error("AI 서비스 크레딧이 부족합니다.");
      }
      throw new Error(`AI 분석 중 오류가 발생했습니다: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI Response received:", content);

    // Parse the JSON response from AI - 더 안전한 파싱
    let parsedData;
    let isInvalidImage = false;
    try {
      let jsonStr = content.trim();
      
      // 1. 마크다운 코드블럭 제거 (```json ... ``` 또는 ``` ... ```)
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      
      // 2. 전체가 {...}로 시작하고 끝나면 그대로 파싱
      if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
        parsedData = JSON.parse(jsonStr);
      } else {
        // 3. 마지막 fallback: {} 정규식으로 추출
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      }
      
      // is_health_checkup 필드로 판단 (가장 단순한 방식)
      if (parsedData.is_health_checkup === false) {
        isInvalidImage = true;
        console.log("AI determined this is not a health checkup image");
      } else if (!parsedData.items || !Array.isArray(parsedData.items)) {
        // items 필드가 없거나 배열이 아니면 파싱 실패로 간주
        isInvalidImage = true;
        console.log("Missing or invalid items field");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      isInvalidImage = true;
    }

    // Handle invalid image case
    if (isInvalidImage) {
      console.log("Invalid health checkup image detected");
      
      await supabase
        .from("health_records")
        .update({ 
          status: "rejected",
          coach_comment: "업로드하신 이미지가 건강검진 결과지가 아닙니다. 건강검진 결과지 이미지를 업로드해주세요."
        })
        .eq("id", recordId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "invalid_image",
          message: "업로드하신 이미지가 건강검진 결과지가 아닙니다. 건강검진 결과지 이미지를 다시 업로드해주세요.",
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get user_id from health_records
    const { data: recordData, error: recordFetchError } = await supabase
      .from("health_records")
      .select("user_id")
      .eq("id", recordId)
      .single();

    if (recordFetchError || !recordData) {
      console.error("Failed to fetch health record:", recordFetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "레코드를 찾을 수 없습니다. 레코드가 삭제되었을 수 있습니다.",
          data: parsedData 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update health record with parsed data (is_health_checkup 필드는 저장하지 않음)
    const { is_health_checkup, ...dataToStore } = parsedData;
    
    const { error: updateError } = await supabase
      .from("health_records")
      .update({
        status: "pending_review",
        parsed_data: dataToStore,
        health_age: dataToStore.health_age,
        health_tags: dataToStore.health_tags || [],
      })
      .eq("id", recordId);

    if (updateError) {
      console.error("Failed to update health record:", updateError);
      throw new Error("분석 결과 저장에 실패했습니다.");
    }

    // Also create/update ai_health_reports for AIHealthReportCard display
    const { error: reportError } = await supabase
      .from("ai_health_reports")
      .upsert({
        user_id: recordData.user_id,
        source_type: "health_checkup",
        source_record_id: recordId,
        status: "completed",
        ai_result: dataToStore,
        input_snapshot: { imageUrls },
      }, {
        onConflict: "source_record_id",
      });

    if (reportError) {
      console.error("Failed to create ai_health_report:", reportError);
    }

    console.log("Health checkup analysis completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "분석이 완료되었습니다.",
        data: dataToStore 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-health-checkup:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
