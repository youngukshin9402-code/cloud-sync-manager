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
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: Home, label: "홈" },
  { path: "/medical", icon: Stethoscope, label: "건강" },
  { path: "/nutrition", icon: Utensils, label: "영양" },
  { path: "/exercise", icon: Dumbbell, label: "운동" },
  { path: "/shop", icon: ShoppingBag, label: "상점" },
  { path: "/profile", icon: User, label: "마이" },
];

export function AppLayout() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  // 하단 탭이 있는 사용자인지 확인
  const hasBottomNav = profile && (profile.user_type === "user" || profile.user_type === "guardian");

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border safe-area-top">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">영양갱</span>
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
              className="p-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 - 하단 탭 높이 + safe area 만큼 padding */}
      <main className={cn(
        "container mx-auto px-4 py-6",
        hasBottomNav && "pb-32"
      )}>
        <Outlet />
      </main>

      {/* 하단 네비게이션 (일반 사용자/보호자용) */}
      {hasBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 safe-area-bottom">
          <div className="container mx-auto px-2">
            <div className="flex justify-around items-center h-16">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] px-2 py-1.5 rounded-xl transition-all",
                      isActive
                        ? "text-primary bg-primary/15 scale-105"
                        : "text-muted-foreground hover:text-foreground active:bg-muted/50"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                    <span className={cn(
                      "text-xs font-medium leading-tight",
                      isActive && "font-semibold"
                    )}>{item.label}</span>
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
