import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User,
  Crown,
  Link2,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Coins,
  Video,
} from "lucide-react";

export default function Profile() {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const isGuardian = profile.user_type === "guardian";
  const isPremium = profile.subscription_tier === "premium";

  const menuItems = [
    {
      icon: User,
      label: "내 정보 수정",
      path: "/profile/edit",
    },
    {
      icon: Coins,
      label: "포인트 내역",
      path: "/profile/points",
      badge: `${profile.current_points.toLocaleString()}P`,
    },
    {
      icon: Link2,
      label: isGuardian ? "연결된 가족" : "보호자 연결",
      path: "/guardian",
    },
    {
      icon: Crown,
      label: isPremium ? "프리미엄 관리" : "프리미엄 가입",
      path: "/premium",
      highlight: !isPremium,
    },
    ...(isPremium
      ? [
          {
            icon: Video,
            label: "1:1 코칭 예약",
            path: "/coaching",
          },
        ]
      : []),
    {
      icon: Bell,
      label: "알림 설정",
      path: "/profile/notifications",
    },
    {
      icon: HelpCircle,
      label: "고객센터",
      path: "/help",
    },
    {
      icon: FileText,
      label: "이용약관",
      path: "/terms",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 프로필 카드 */}
      <div className="bg-card rounded-3xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {profile.nickname}님
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {isPremium ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  프리미엄
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                  베이직
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                {isGuardian ? "보호자" : "일반 회원"}
              </span>
            </div>
          </div>
        </div>

        {/* 포인트 */}
        <div className="mt-6 p-4 bg-primary/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">보유 포인트</p>
            <p className="text-2xl font-bold text-primary">
              {profile.current_points.toLocaleString()}P
            </p>
          </div>
          <Button variant="outline" size="sm">
            사용하기
          </Button>
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        {menuItems.map((item, index) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 p-5 hover:bg-muted transition-colors ${
              index !== menuItems.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <item.icon
              className={`w-6 h-6 ${
                item.highlight ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`flex-1 text-lg ${
                item.highlight ? "text-primary font-medium" : "text-foreground"
              }`}
            >
              {item.label}
            </span>
            {item.badge && (
              <span className="text-sm font-medium text-primary">
                {item.badge}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* 로그아웃 */}
      <Button
        variant="ghost"
        size="touch"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={signOut}
      >
        <LogOut className="w-5 h-5" />
        로그아웃
      </Button>

      {/* 버전 */}
      <p className="text-center text-sm text-muted-foreground">
        건강양갱 v1.0.0
      </p>
    </div>
  );
}
