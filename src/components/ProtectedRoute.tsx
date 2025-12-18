import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: Array<"user" | "guardian" | "coach" | "admin">;
}

export function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

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

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 권한 체크
  if (allowedTypes && profile && !allowedTypes.includes(profile.user_type)) {
    // 권한이 없으면 대시보드로 리다이렉트
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
