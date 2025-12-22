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

    // Download images and convert to base64
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
        return `data:image/jpeg;base64,${base64}`;
      })
    );

    const validImages = imageContents.filter(Boolean);
    
    if (validImages.length === 0) {
      throw new Error("No valid images to analyze");
    }

    // Prepare messages for AI analysis
    const userContent: any[] = [
      {
        type: "text",
        text: `당신은 건강검진 결과를 분석하는 전문 AI입니다. 
다음 건강검진 결과 이미지를 분석해서 JSON 형식으로 응답해주세요.

응답 형식:
{
  "health_age": 숫자 (건강 나이 추정),
  "summary": "전반적인 건강 상태 요약 (2-3문장)",
  "items": [
    {
      "name": "검사 항목명",
      "value": "측정값",
      "unit": "단위",
      "status": "normal" | "warning" | "danger",
      "description": "해당 수치에 대한 설명"
    }
  ],
  "health_tags": ["high_bp", "diabetes", "high_cholesterol"] 등 해당되는 태그 배열,
  "recommendations": ["권장 사항 1", "권장 사항 2"]
}

건강 나이는 검진 결과를 바탕으로 실제 나이 대비 신체 기능이 어느 정도인지 추정해주세요.
status는 정상 범위면 "normal", 주의 필요하면 "warning", 관리가 필요하면 "danger"로 표시해주세요.
health_tags는 해당되는 항목만 배열에 포함해주세요: high_bp, low_bp, diabetes, prediabetes, high_cholesterol, high_triglycerides, anemia, liver_issue, kidney_issue, obesity, underweight

이미지에서 읽을 수 있는 모든 수치를 분석해주세요.`,
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

    // Parse the JSON response from AI
    let parsedData;
    let isInvalidImage = false;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
        
        // Check if the AI indicates this is not a health checkup image
        // Common indicators: no items, null health_age, summary mentions it's not a health checkup
        const isNotHealthCheckup = 
          (parsedData.items && parsedData.items.length === 0 && parsedData.health_age === null) ||
          (parsedData.summary && (
            parsedData.summary.includes("건강검진 결과가 아닌") ||
            parsedData.summary.includes("건강검진 결과 이미지가 아닙니다") ||
            parsedData.summary.includes("식단") ||
            parsedData.summary.includes("물 섭취")
          ));
        
        if (isNotHealthCheckup) {
          isInvalidImage = true;
        }
      } else {
        // No JSON found - likely AI explained that it's not a health checkup image
        isInvalidImage = true;
        console.log("No JSON found in AI response - likely not a health checkup image");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      isInvalidImage = true;
    }

    // Handle invalid image case
    if (isInvalidImage) {
      console.log("Invalid health checkup image detected");
      
      // Update record status to rejected with explanation
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
      // Record might have been deleted during analysis - just return success without updating
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "레코드를 찾을 수 없습니다. 레코드가 삭제되었을 수 있습니다.",
          data: parsedData 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update health record with parsed data
    const { error: updateError } = await supabase
      .from("health_records")
      .update({
        status: "pending_review",
        parsed_data: parsedData,
        health_age: parsedData.health_age,
        health_tags: parsedData.health_tags || [],
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
        ai_result: parsedData,
        input_snapshot: { imageUrls },
      }, {
        onConflict: "source_record_id",
      });

    if (reportError) {
      console.error("Failed to create ai_health_report:", reportError);
      // Non-fatal, continue anyway
    }

    console.log("Health checkup analysis completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "분석이 완료되었습니다.",
        data: parsedData 
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
