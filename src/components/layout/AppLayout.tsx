import { Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Stethoscope,
  Utensils,
  Dumbbell,
  User,
  LogOut,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: Home, label: "홈" },
  { path: "/medical", icon: Stethoscope, label: "의료" },
  { path: "/nutrition", icon: Utensils, label: "영양" },
  { path: "/exercise", icon: Dumbbell, label: "운동" },
  { path: "/profile", icon: User, label: "마이" },
];

export function AppLayout() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">건강양갱</span>
          </Link>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {profile.nickname}님
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile.current_points.toLocaleString()} 포인트
                </p>
              </div>
            )}
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* 하단 네비게이션 (일반 사용자/보호자용) */}
      {profile && (profile.user_type === "user" || profile.user_type === "guardian") && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-around items-center h-20">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
