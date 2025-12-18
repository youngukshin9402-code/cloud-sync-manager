import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Medical from "./pages/Medical";
import Nutrition from "./pages/Nutrition";
import Exercise from "./pages/Exercise";
import Profile from "./pages/Profile";
import Guardian from "./pages/Guardian";
import NotFound from "./pages/NotFound";

// Coach Pages
import CoachDashboard from "./pages/coach/CoachDashboard";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";

// Components
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

// 사용자 유형에 따른 리다이렉트 컴포넌트
function AuthenticatedRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // 사용자 유형에 따라 적절한 대시보드로 리다이렉트
  switch (profile.user_type) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "coach":
      return <Navigate to="/coach" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* 공개 페이지 */}
      <Route
        path="/"
        element={user ? <AuthenticatedRedirect /> : <Index />}
      />
      <Route
        path="/auth"
        element={user ? <AuthenticatedRedirect /> : <Auth />}
      />

      {/* 일반 사용자 / 보호자 페이지 */}
      <Route
        element={
          <ProtectedRoute allowedTypes={["user", "guardian"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/medical" element={<Medical />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/exercise" element={<Exercise />} />
        <Route path="/guardian" element={<Guardian />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* 코치 페이지 */}
      <Route
        path="/coach"
        element={
          <ProtectedRoute allowedTypes={["coach", "admin"]}>
            <CoachDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach/*"
        element={
          <ProtectedRoute allowedTypes={["coach", "admin"]}>
            <CoachDashboard />
          </ProtectedRoute>
        }
      />

      {/* 관리자 페이지 */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
