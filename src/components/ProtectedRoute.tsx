import { Navigate, useLocation, Link } from "react-router-dom";
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
  const { user, profile, loading: authLoading } = useAuth();
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

  // Check consent (only for user/guardian types)
  if (requireConsent && profile && ['user', 'guardian'].includes(profile.user_type)) {
    if (!hasRequiredConsents) {
      return <Navigate to="/consent" state={{ from: location }} replace />;
    }
  }

  // Check profile completion (nickname required)
  if (profile && !profile.nickname) {
    // Could redirect to profile setup page if needed
    // For now, allow access but this could be expanded
  }

  // 권한 체크
  if (allowedTypes && profile && !allowedTypes.includes(profile.user_type)) {
    // Redirect to /forbidden instead of showing inline error
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
