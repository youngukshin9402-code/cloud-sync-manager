import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DailyDataProvider } from "@/contexts/DailyDataContext";
import { HealthAgeProvider } from "@/contexts/HealthAgeContext";
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
import CoachChat from "./pages/coach/CoachChat";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoaching from "./pages/admin/AdminCoaching";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminHealthRecords from "./pages/admin/AdminHealthRecords";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminPoints from "./pages/admin/AdminPoints";
import AdminStats from "./pages/admin/AdminStats";
import AdminChats from "./pages/admin/AdminChats";
import AdminConsultations from "./pages/admin/AdminConsultations";
import AdminHealthReviews from "./pages/admin/AdminHealthReviews";
import AdminCheckinReports from "./pages/admin/AdminCheckinReports";
import CoachingFeedback from "./pages/mypage/CoachingFeedback";
import Chat from "./pages/Chat";

// Components
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

// 사용자 유형에 따른 리다이렉트 컴포넌트
function AuthenticatedRedirect() {
  const { user, profile, loading, isAdmin, isCoach, signOut, refreshProfile } = useAuth();
  const [retrying, setRetrying] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated but profile not available (usually backend policy/creation issue)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-3">프로필을 불러올 수 없어요</h1>
          <p className="text-muted-foreground mb-6">
            로그인은 되었지만 프로필 데이터에 접근할 수 없습니다. 다시 시도하거나 로그아웃 후 재로그인 해주세요.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                try {
                  await refreshProfile();
                } finally {
                  setRetrying(false);
                }
              }}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium disabled:opacity-60"
            >
              {retrying ? "다시 불러오는 중..." : "다시 시도"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                window.location.href = "/auth";
              }}
              className="bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 사용자 유형에 따라 적절한 대시보드로 리다이렉트
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isCoach || profile.user_type === "coach") {
    return <Navigate to="/coach" replace />;
  }
  return <Navigate to="/dashboard" replace />;
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
        <Route path="/data-export" element={<DataExport />} />
        <Route path="/chat" element={<Chat />} />
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
        path="/coach/chat"
        element={
          <ProtectedRoute allowedTypes={["coach", "admin"]}>
            <CoachChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach/chat/:userId"
        element={
          <ProtectedRoute allowedTypes={["coach", "admin"]}>
            <CoachChat />
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
        path="/admin/dashboard"
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
      <Route
        path="/admin/health-records"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminHealthRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/coaches"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminCoaches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/points"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminPoints />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stats"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/chats"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminChats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/consultations"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminConsultations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/health-reviews"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminHealthReviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/checkin-reports"
        element={
          <ProtectedRoute allowedTypes={["admin"]}>
            <AdminCheckinReports />
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
      <HealthAgeProvider>
        <DailyDataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </DailyDataProvider>
      </HealthAgeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
