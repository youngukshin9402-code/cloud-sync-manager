import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserConsent } from "@/hooks/useUserConsent";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: Array<"user" | "guardian" | "coach" | "admin">;
  requireConsent?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedTypes,
  requireConsent = true 
}: ProtectedRouteProps) {
  const { user, profile, loading: authLoading, isAdmin, isCoach } = useAuth();
  const { hasRequiredConsents, loading: consentLoading } = useUserConsent();
  const location = useLocation();

  // Combined loading state
  const loading = authLoading || (user && requireConsent && consentLoading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-lg text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // user는 있지만 profile이 null인 경우 - 오류 복구 페이지로 이동
  if (!profile) {
    // 로그아웃 후 다시 로그인하도록 유도
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-4">프로필 로드 오류</h2>
          <p className="text-muted-foreground mb-6">
            프로필 정보를 불러오는 데 문제가 발생했습니다. 
            로그아웃 후 다시 로그인해주세요.
          </p>
          <button
            onClick={() => window.location.href = "/auth"}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // Check consent (only for user/guardian types)
  if (requireConsent && ['user', 'guardian'].includes(profile.user_type)) {
    if (!hasRequiredConsents) {
      return <Navigate to="/consent" state={{ from: location }} replace />;
    }
  }

  // 권한 체크 (allowedTypes 기반)
  if (allowedTypes) {
    // admin은 isAdmin으로 체크, coach는 isCoach로 체크
    const hasAccess = allowedTypes.some(type => {
      if (type === 'admin') return isAdmin;
      if (type === 'coach') return isCoach;
      return profile.user_type === type;
    });

    if (!hasAccess) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
}
