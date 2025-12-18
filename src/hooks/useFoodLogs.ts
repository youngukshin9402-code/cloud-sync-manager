import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Nutrient {
  name: string;
  amount: string;
  unit: string;
}

export interface FoodLog {
  id: string;
  time: string;
  name: string;
  calories: number;
  nutrition_score: number;
  feedback: string;
  nutrients: Nutrient[];
  recommendations: string[];
  imageUrl?: string;
  type: "good" | "caution" | "warning";
}

export interface HealthTags {
  tags: string[];
  recommendations: Record<string, string>;
}

const HEALTH_TAG_RECOMMENDATIONS: Record<string, string> = {
  high_bp: "저염식을 권장합니다. 나트륨 섭취를 줄여주세요.",
  diabetes: "저당, 저탄수화물 식품을 선택해주세요.",
  obesity: "저칼로리, 고단백 식품이 좋습니다.",
  anemia: "철분이 풍부한 음식을 드세요.",
  high_cholesterol: "저지방 식품과 섬유질을 늘려주세요.",
};

export function useFoodLogs() {
  const { user } = useAuth();
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [healthTags, setHealthTags] = useState<HealthTags>({ tags: [], recommendations: {} });
  const [todayPoints, setTodayPoints] = useState(0);

  // Fetch user's health tags from latest health record
  const fetchHealthTags = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("health_records")
        .select("health_tags")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.health_tags) {
        const tags = data.health_tags as string[];
        const recommendations: Record<string, string> = {};
        tags.forEach((tag) => {
          if (HEALTH_TAG_RECOMMENDATIONS[tag]) {
            recommendations[tag] = HEALTH_TAG_RECOMMENDATIONS[tag];
          }
        });
        setHealthTags({ tags, recommendations });
      }
    } catch (error) {
      console.log("No health records found");
    }
  }, [user]);

  // Fetch today's food logs
  const fetchFoodLogs = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_type", "food")
        .eq("log_date", today)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const logs: FoodLog[] = (data || []).map((log) => {
        const aiData = log.ai_feedback ? JSON.parse(log.ai_feedback) : {};
        const score = aiData.nutrition_score || 70;

        return {
          id: log.id,
          time: new Date(log.created_at).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          name: aiData.name || log.content,
          calories: aiData.calories || 0,
          nutrition_score: score,
          feedback: aiData.feedback || "",
          nutrients: aiData.nutrients || [],
          recommendations: aiData.recommendations || [],
          imageUrl: log.image_url || undefined,
          type: score >= 80 ? "good" : score >= 60 ? "caution" : "warning",
        };
      });

      setFoodLogs(logs);

      // Calculate today's points
      const points = (data || []).reduce((sum, log) => sum + (log.points_earned || 0), 0);
      setTodayPoints(points);
    } catch (error) {
      console.error("Error fetching food logs:", error);
      toast.error("기록을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Upload and analyze food image
  const uploadAndAnalyzeFood = async (file: File) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return null;
    }

    setIsAnalyzing(true);

    try {
      // Upload image to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("food-logs")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("이미지 업로드에 실패했습니다");
      }

      const { data: urlData } = supabase.storage
        .from("food-logs")
        .getPublicUrl(uploadData.path);

      const imageUrl = urlData.publicUrl;

      // Call AI analysis function
      toast.info("AI가 음식을 분석하고 있어요...");

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-food",
        {
          body: {
            imageUrl,
            userId: user.id,
            healthTags: healthTags.tags,
          },
        }
      );

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        throw new Error("음식 분석에 실패했습니다");
      }

      // Save to daily_logs
      const today = new Date().toISOString().split("T")[0];
      const pointsEarned = 50; // Points for logging a meal

      const { data: logData, error: logError } = await supabase
        .from("daily_logs")
        .insert([{
          user_id: user.id,
          log_type: "food" as const,
          log_date: today,
          content: analysisData.name,
          image_url: imageUrl,
          ai_feedback: JSON.stringify(analysisData),
          points_earned: pointsEarned,
          is_completed: true,
        }])
        .select()
        .single();

      if (logError) {
        console.error("Log error:", logError);
        throw new Error("기록 저장에 실패했습니다");
      }

      // Update user's points directly
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_points")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ current_points: (profile?.current_points || 0) + pointsEarned })
        .eq("id", user.id);

      // Add to point history
      await supabase.from("point_history").insert([{
        user_id: user.id,
        amount: pointsEarned,
        reason: `식사 기록: ${analysisData.name}`,
      }]);

      toast.success(`+${pointsEarned} 포인트! ${analysisData.name} 기록 완료`);

      // Refresh logs
      await fetchFoodLogs();

      return analysisData;
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick log without image
  const quickLog = async (foodName: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const pointsEarned = 10; // Less points for quick log

      const quickFoodData = {
        name: foodName,
        calories: 0,
        nutrition_score: 70,
        feedback: "잘하셨어요! 👍",
        nutrients: [],
        recommendations: [],
      };

      const { error: logError } = await supabase.from("daily_logs").insert([{
        user_id: user.id,
        log_type: "food" as const,
        log_date: today,
        content: foodName,
        ai_feedback: JSON.stringify(quickFoodData),
        points_earned: pointsEarned,
        is_completed: true,
      }]);

      if (logError) throw logError;

      // Update points
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_points")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ current_points: (profile?.current_points || 0) + pointsEarned })
        .eq("id", user.id);

      await supabase.from("point_history").insert([{
        user_id: user.id,
        amount: pointsEarned,
        reason: `빠른 기록: ${foodName}`,
      }]);

      toast.success(`+${pointsEarned} 포인트! ${foodName} 기록 완료`);
      await fetchFoodLogs();
    } catch (error) {
      console.error("Quick log error:", error);
      toast.error("기록에 실패했습니다");
    }
  };

  useEffect(() => {
    if (user) {
      fetchFoodLogs();
      fetchHealthTags();
    }
  }, [user, fetchFoodLogs, fetchHealthTags]);

  return {
    foodLogs,
    isLoading,
    isAnalyzing,
    healthTags,
    todayPoints,
    uploadAndAnalyzeFood,
    quickLog,
    fetchFoodLogs,
  };
}
