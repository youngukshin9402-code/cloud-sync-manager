import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setCurrentUserId, clearCurrentUserId } from "@/lib/localStorage";

type UserType = "user" | "guardian" | "coach" | "admin";
type AppRole = "admin" | "coach" | "guardian" | "user";

interface Profile {
  id: string;
  nickname: string | null;
  phone: string | null;
  user_type: UserType;
  subscription_tier: "basic" | "premium";
  current_points: number;
  assigned_coach_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isCoach: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isUserType = (v: unknown): v is UserType =>
  v === "user" || v === "guardian" || v === "coach" || v === "admin";
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching roles:", error);
      return [];
    }
    return (data || []).map((r) => r.role as AppRole);
  };

  const ensureProfile = async (authUser: User) => {
    const existing = await fetchProfile(authUser.id);
    if (existing) {
      // 기존 프로필이 있으면 nutrition_settings도 확인
      await ensureNutritionSettings(authUser);
      return existing;
    }

    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    const nickname =
      typeof meta.nickname === "string"
        ? meta.nickname
        : authUser.email
          ? authUser.email.split("@")[0]
          : null;

    const user_type: UserType = isUserType(meta.user_type) ? meta.user_type : "user";

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          nickname,
          phone: null,
          user_type,
          subscription_tier: "basic",
          current_points: 0,
          assigned_coach_id: null,
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      return null;
    }

    // 새 프로필 생성 시 nutrition_settings도 생성
    await ensureNutritionSettings(authUser);

    return data as Profile;
  };

  // 회원가입 시 메타데이터로부터 nutrition_settings 생성
  const ensureNutritionSettings = async (authUser: User) => {
    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    
    // 메타데이터에 신체정보가 있는지 확인
    const heightCm = typeof meta.height_cm === "number" ? meta.height_cm : null;
    const currentWeight = typeof meta.current_weight === "number" ? meta.current_weight : null;
    const goalWeight = typeof meta.goal_weight === "number" ? meta.goal_weight : null;
    const age = typeof meta.age === "number" ? meta.age : null;
    const gender = typeof meta.gender === "string" ? meta.gender : null;
    const activityLevel = typeof meta.activity_level === "string" ? meta.activity_level : null;
    const conditions = typeof meta.conditions === "string" ? meta.conditions : null;

    // 신체정보가 있으면 nutrition_settings 생성/업데이트
    if (currentWeight || heightCm || age) {
      // 목표 칼로리 계산
      let calorieGoal = 2000;
      let carbGoalG = 300;
      let proteinGoalG = 100;
      let fatGoalG = 44;

      if (currentWeight && currentWeight > 0) {
        const height = heightCm || 170;
        const userAge = age || 30;
        
        // Mifflin-St Jeor 공식
        let bmr: number;
        if (gender === 'female') {
          bmr = (10 * currentWeight) + (6.25 * height) - (5 * userAge) - 161;
        } else {
          bmr = (10 * currentWeight) + (6.25 * height) - (5 * userAge) + 5;
        }

        // 활동계수
        let activityMultiplier = 1.375; // 기본: 가벼운 활동
        switch (activityLevel) {
          case 'sedentary': activityMultiplier = 1.2; break;
          case 'light': activityMultiplier = 1.375; break;
          case 'moderate': activityMultiplier = 1.55; break;
          case 'active': activityMultiplier = 1.725; break;
          case 'very_active': activityMultiplier = 1.9; break;
        }

        let calories = bmr * activityMultiplier;

        // 감량/증량 조정
        if (goalWeight && goalWeight < currentWeight) {
          calories -= 400;
        } else if (goalWeight && goalWeight > currentWeight) {
          calories += 300;
        }

        calories = Math.max(1200, Math.min(3500, calories));
        calorieGoal = Math.round(calories);

        // 매크로 비율
        let carbRatio = 0.55;
        let proteinRatio = 0.25;
        if (goalWeight && goalWeight < currentWeight) {
          carbRatio = 0.50;
          proteinRatio = 0.30;
        }

        carbGoalG = Math.round((calories * carbRatio) / 4);
        proteinGoalG = Math.round((calories * proteinRatio) / 4);
        fatGoalG = Math.round((calories * 0.20) / 9);
      }

      const { error } = await supabase
        .from("nutrition_settings")
        .upsert(
          {
            user_id: authUser.id,
            height_cm: heightCm,
            current_weight: currentWeight,
            goal_weight: goalWeight,
            age: age,
            gender: gender,
            activity_level: activityLevel,
            conditions: conditions ? [conditions] : null,
            calorie_goal: calorieGoal,
            carb_goal_g: carbGoalG,
            protein_goal_g: proteinGoalG,
            fat_goal_g: fatGoalG,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Error creating nutrition_settings:", error);
      }
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const newProfile = await fetchProfile(user.id);
    setProfile(newProfile);
    const newRoles = await fetchRoles(user.id);
    setRoles(newRoles);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        // 로그아웃 시 현재 사용자 ID 클리어 (localStorage 네임스페이스 분리)
        clearCurrentUserId();
        return;
      }

      // 로그인 시 현재 사용자 ID 설정
      setCurrentUserId(nextSession.user.id);

      // Avoid potential deadlock by deferring profile work
      setTimeout(() => {
        Promise.all([
          ensureProfile(nextSession.user),
          fetchRoles(nextSession.user.id)
        ])
          .then(([profileData, rolesData]) => {
            setProfile(profileData);
            setRoles(rolesData);
          })
          .finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // 초기 로드 시 현재 사용자 ID 설정
        setCurrentUserId(session.user.id);
        Promise.all([
          ensureProfile(session.user),
          fetchRoles(session.user.id)
        ])
          .then(([profileData, rolesData]) => {
            setProfile(profileData);
            setRoles(rolesData);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    // 로그아웃 시 현재 사용자 ID 클리어
    clearCurrentUserId();
  };

  // 관리자 여부: user_roles 테이블 기반으로만 확인 (이메일 패턴 백도어 제거)
  const isAdmin = roles.includes("admin");
  
  const isCoach = roles.includes("coach") || profile?.user_type === "coach";

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      isAdmin,
      isCoach,
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
