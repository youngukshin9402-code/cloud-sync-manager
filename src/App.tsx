import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useLocalDataMigration } from "@/hooks/useLocalDataMigration";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Medical from "./pages/Medical";
import Nutrition from "./pages/Nutrition";
import Exercise from "./pages/Exercise";
import Profile from "./pages/Profile";
import Guardian from "./pages/Guardian";
import Premium from "./pages/Premium";
import Coaching from "./pages/Coaching";
import VideoCall from "./pages/VideoCall";
import Shop from "./pages/Shop";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import Privacy from "./pages/Privacy";
import Water from "./pages/Water";
import InBody from "./pages/InBody";
import WeightTracking from "./pages/WeightTracking";
import HealthCheckup from "./pages/HealthCheckup";
import DataExport from "./pages/DataExport";
import Consent from "./pages/Consent";
import Terms from "./pages/Terms";
import HealthPrivacy from "./pages/HealthPrivacy";
import RefundPolicy from "./pages/RefundPolicy";

// MyPage Pages
import ProfileEdit from "./pages/mypage/ProfileEdit";
import PointsPage from "./pages/mypage/Points";
import GuardianSettingsPage from "./pages/mypage/GuardianSettings";
import NotificationSettingsPage from "./pages/mypage/NotificationSettings";
import SupportPage from "./pages/mypage/Support";
import OrdersPage from "./pages/mypage/Orders";

// Coach Pages
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachUserDetail from "./pages/coach/CoachUserDetail";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoaching from "./pages/admin/AdminCoaching";
import AdminTickets from "./pages/admin/AdminTickets";
import CoachingFeedback from "./pages/mypage/CoachingFeedback";

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
  
  // Initialize one-time local→server migration
  useLocalDataMigration();

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

      {/* 공개 페이지 */}
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/consent" element={<Consent />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/health-privacy" element={<HealthPrivacy />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />

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
        <Route path="/premium" element={<Premium />} />
        <Route path="/coaching" element={<Coaching />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/water" element={<Water />} />
        <Route path="/inbody" element={<InBody />} />
        <Route path="/weight" element={<WeightTracking />} />
        <Route path="/health-checkup" element={<HealthCheckup />} />
        
        {/* MyPage Routes */}
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/points" element={<PointsPage />} />
        <Route path="/profile/notifications" element={<NotificationSettingsPage />} />
        <Route path="/mypage/guardian" element={<GuardianSettingsPage />} />
        <Route path="/mypage/support" element={<SupportPage />} />
        <Route path="/mypage/orders" element={<OrdersPage />} />
        <Route path="/mypage/feedback" element={<CoachingFeedback />} />
        <Route path="/data-export" element={<DataExport />} />
      </Route>

      {/* 영상통화 (모든 역할 접근) */}
      <Route
        path="/video-call/:sessionId"
        element={
          <ProtectedRoute allowedTypes={["user", "guardian", "coach", "admin"]}>
            <VideoCall />
          </ProtectedRoute>
        }
      />

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
        path="/coach/user/:userId"
        element={
          <ProtectedRoute allowedTypes={["coach", "admin"]}>
            <CoachUserDetail />
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
        path="/admin/users"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/coaching"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminCoaching />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminTickets />
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
