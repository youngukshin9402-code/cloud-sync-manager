import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserStats {
  totalUsers: number;
  premiumUsers: number;
  todaySignups: number;
  todayUploads: number;
  pendingReviews: number;
}

interface UserProfile {
  id: string;
  nickname: string | null;
  phone: string | null;
  user_type: string;
  subscription_tier: string;
  current_points: number;
  assigned_coach_id: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  health_tags: string[] | null;
  image_url: string | null;
  purchase_link: string | null;
  is_active: boolean;
}

interface HealthRecord {
  id: string;
  user_id: string;
  status: string;
  health_age: number | null;
  health_tags: string[] | null;
  created_at: string;
  coach_comment: string | null;
  user?: { nickname: string | null };
}

export function useAdminData() {
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    premiumUsers: 0,
    todaySignups: 0,
    todayUploads: 0,
    pendingReviews: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingRecords, setPendingRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 통계 가져오기
  const fetchStats = async () => {
    const today = new Date().toISOString().split("T")[0];

    // 전체 사용자 수
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("user_type", ["user", "guardian"]);

    // 프리미엄 사용자 수
    const { count: premiumUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_tier", "premium");

    // 오늘 가입
    const { count: todaySignups } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`);

    // 오늘 업로드
    const { count: todayUploads } = await supabase
      .from("health_records")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`);

    // 검토 대기
    const { count: pendingReviews } = await supabase
      .from("health_records")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review");

    setStats({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      todaySignups: todaySignups || 0,
      todayUploads: todayUploads || 0,
      pendingReviews: pendingReviews || 0,
    });
  };

  // 사용자 목록
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("user_type", ["user", "guardian"])
      .order("created_at", { ascending: false });

    if (!error) setUsers(data || []);
  };

  // 코치 목록
  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_type", "coach")
      .order("created_at", { ascending: false });

    if (!error) setCoaches(data || []);
  };

  // 상품 목록
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);
  };

  // 검토 대기 건강검진
  const fetchPendingRecords = async () => {
    const { data, error } = await supabase
      .from("health_records")
      .select(`
        *,
        profiles!health_records_user_id_fkey(nickname)
      `)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (!error) {
      const formatted = (data || []).map((r) => ({
        ...r,
        user: { nickname: (r as any).profiles?.nickname },
      }));
      setPendingRecords(formatted);
    }
  };

  // 코치 배정
  const assignCoach = async (userId: string, coachId: string | null) => {
    const { error } = await supabase
      .from("profiles")
      .update({ assigned_coach_id: coachId })
      .eq("id", userId);

    if (error) {
      toast({
        title: "배정 실패",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "코치 배정 완료" });
    await fetchUsers();
    return true;
  };

  // 사용자 역할 변경
  const changeUserRole = async (userId: string, newRole: "user" | "guardian" | "coach" | "admin") => {
    const { error } = await supabase
      .from("profiles")
      .update({ user_type: newRole })
      .eq("id", userId);

    if (error) {
      toast({
        title: "역할 변경 실패",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    // user_roles 테이블도 업데이트
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    toast({ title: "역할 변경 완료" });
    await fetchUsers();
    await fetchCoaches();
    return true;
  };

  // 상품 추가/수정
  const saveProduct = async (product: Partial<Product>) => {
    const { error } = product.id
      ? await supabase.from("products").update(product).eq("id", product.id)
      : await supabase.from("products").insert(product as any);

    if (error) {
      toast({
        title: "상품 저장 실패",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "상품 저장 완료" });
    await fetchProducts();
    return true;
  };

  // 상품 삭제
  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "상품 삭제 완료" });
    await fetchProducts();
    return true;
  };

  // 건강검진 최종 승인
  const approveHealthRecord = async (
    recordId: string,
    status: "completed" | "rejected"
  ) => {
    const { error } = await supabase
      .from("health_records")
      .update({ status })
      .eq("id", recordId);

    if (error) {
      toast({
        title: "처리 실패",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: status === "completed" ? "승인 완료" : "반려 완료",
    });
    await fetchPendingRecords();
    await fetchStats();
    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchCoaches(),
        fetchProducts(),
        fetchPendingRecords(),
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    stats,
    users,
    coaches,
    products,
    pendingRecords,
    loading,
    assignCoach,
    changeUserRole,
    saveProduct,
    deleteProduct,
    approveHealthRecord,
    refreshData: () => {
      fetchStats();
      fetchUsers();
      fetchCoaches();
      fetchProducts();
      fetchPendingRecords();
    },
  };
}
