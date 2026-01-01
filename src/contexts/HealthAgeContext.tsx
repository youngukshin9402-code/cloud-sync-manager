/**
 * 건강나이 전역 상태 Context
 * - 로그인 시 DB에서 건강나이 데이터를 fetch
 * - 전역 상태로 관리하여 홈탭/건강탭에서 즉시 사용
 * - 재계산 시 DB upsert 및 전역 상태 업데이트
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface HealthAgeData {
  id: string;
  actualAge: number;
  healthAge: number;
  bodyScore: number | null;
  analysis: string | null;
  inbodyData: Json | null;
  inbodyRecordDate: string | null;
  calculatedAt: string;
}

interface HealthAgeContextType {
  healthAgeData: HealthAgeData | null;
  loading: boolean;
  saveHealthAge: (data: { actualAge: number; healthAge: number; bodyScore?: number | null; analysis?: string | null; inbodyData?: Json | null; inbodyRecordDate?: string | null }) => Promise<void>;
  clearHealthAge: () => Promise<void>;
  refreshHealthAge: () => Promise<void>;
}

const HealthAgeContext = createContext<HealthAgeContextType | undefined>(undefined);

export function HealthAgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [healthAgeData, setHealthAgeData] = useState<HealthAgeData | null>(null);
  const [loading, setLoading] = useState(false);

  // DB에서 건강나이 데이터 fetch
  const fetchHealthAge = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("health_age_results")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching health age:", error);
        return null;
      }

      if (data) {
        return {
          id: data.id,
          actualAge: data.actual_age,
          healthAge: data.health_age,
          bodyScore: data.body_score,
          analysis: data.analysis,
          inbodyData: data.inbody_data,
          inbodyRecordDate: data.inbody_record_date,
          calculatedAt: data.calculated_at,
        } as HealthAgeData;
      }
      return null;
    } catch (err) {
      console.error("Error in fetchHealthAge:", err);
      return null;
    }
  }, []);

  // 건강나이 데이터 새로고침
  const refreshHealthAge = useCallback(async () => {
    if (!user?.id) {
      setHealthAgeData(null);
      return;
    }
    
    setLoading(true);
    try {
      const data = await fetchHealthAge(user.id);
      setHealthAgeData(data);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchHealthAge]);

  // 건강나이 저장 (upsert)
  const saveHealthAge = useCallback(async (data: { actualAge: number; healthAge: number; bodyScore?: number | null; analysis?: string | null; inbodyData?: Json | null; inbodyRecordDate?: string | null }) => {
    if (!user?.id) {
      console.error("Cannot save health age: user not logged in");
      return;
    }

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("health_age_results")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let savedData;
      let error;

      if (existing) {
        // Update existing record
        const result = await supabase
          .from("health_age_results")
          .update({
            actual_age: data.actualAge,
            health_age: data.healthAge,
            body_score: data.bodyScore,
            analysis: data.analysis,
            inbody_data: data.inbodyData,
            inbody_record_date: data.inbodyRecordDate,
            calculated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select()
          .single();
        savedData = result.data;
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("health_age_results")
          .insert({
            user_id: user.id,
            actual_age: data.actualAge,
            health_age: data.healthAge,
            body_score: data.bodyScore,
            analysis: data.analysis,
            inbody_data: data.inbodyData,
            inbody_record_date: data.inbodyRecordDate,
            calculated_at: new Date().toISOString(),
          })
          .select()
          .single();
        savedData = result.data;
        error = result.error;
      }

      if (error) {
        console.error("Error saving health age:", error);
        throw error;
      }

      // 전역 상태 즉시 업데이트
      if (savedData) {
        setHealthAgeData({
          id: savedData.id,
          actualAge: savedData.actual_age,
          healthAge: savedData.health_age,
          bodyScore: savedData.body_score,
          analysis: savedData.analysis,
          inbodyData: savedData.inbody_data,
          inbodyRecordDate: savedData.inbody_record_date,
          calculatedAt: savedData.calculated_at,
        });
      }
    } catch (err) {
      console.error("Error in saveHealthAge:", err);
      throw err;
    }
  }, [user?.id]);

  // 건강나이 삭제
  const clearHealthAge = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("health_age_results")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error clearing health age:", error);
        throw error;
      }

      setHealthAgeData(null);
    } catch (err) {
      console.error("Error in clearHealthAge:", err);
      throw err;
    }
  }, [user?.id]);

  // 사용자 변경 시 건강나이 데이터 fetch
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchHealthAge(user.id)
        .then(setHealthAgeData)
        .finally(() => setLoading(false));
    } else {
      setHealthAgeData(null);
      setLoading(false);
    }
  }, [user?.id, fetchHealthAge]);

  return (
    <HealthAgeContext.Provider
      value={{
        healthAgeData,
        loading,
        saveHealthAge,
        clearHealthAge,
        refreshHealthAge,
      }}
    >
      {children}
    </HealthAgeContext.Provider>
  );
}

export function useHealthAge() {
  const context = useContext(HealthAgeContext);
  if (context === undefined) {
    throw new Error("useHealthAge must be used within a HealthAgeProvider");
  }
  return context;
}
