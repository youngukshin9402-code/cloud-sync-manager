import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User,
  Crown,
  Link2,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Video,
  ShoppingBag,
  Shield,
  MessageCircle,
} from "lucide-react";
import { CheckinSheet } from "@/components/CheckinSheet";

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
      icon: Link2,
      label: "가족 연동",
      path: "/mypage/guardian",
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
      icon: ShoppingBag,
      label: "주문 내역",
      path: "/mypage/orders",
    },
    {
      icon: Bell,
      label: "알림 설정",
      path: "/profile/notifications",
    },
    {
      icon: HelpCircle,
      label: "고객센터",
      path: "/mypage/support",
    },
    {
      icon: Shield,
      label: "개인정보 처리방침",
      path: "/privacy",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 타이틀 */}
      <h1 className="text-xl font-bold">마이페이지</h1>

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

        {/* 관리 방식 */}
        <div className="mt-4 p-3 bg-muted/50 rounded-xl flex items-center justify-between">
          <span className="text-sm text-muted-foreground">관리 방식</span>
          <span className="text-sm font-medium text-primary">직접관리 (고정)</span>
        </div>


        {/* 코치 채팅 버튼 */}
        <Button 
          className="w-full mt-4 gap-2" 
          size="lg"
          onClick={() => window.location.href = '/chat'}
        >
          <MessageCircle className="w-5 h-5" />
          코치 채팅
        </Button>

        {/* 체크인 버튼 */}
        <div className="mt-3">
          <CheckinSheet />
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        {menuItems.map((item, index) => (
          <Link
            key={`${item.path}-${index}`}
            to={item.path}
            className={`flex items-center gap-4 p-5 hover:bg-muted transition-colors ${
              index !== menuItems.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <item.icon className="w-6 h-6 text-muted-foreground" />
            <span className="flex-1 text-lg text-foreground">
              {item.label}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* 로그아웃 */}
      <Button
        variant="ghost"
        size="lg"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={signOut}
      >
        <LogOut className="w-5 h-5 mr-2" />
        로그아웃
      </Button>

      {/* 버전 */}
      <p className="text-center text-sm text-muted-foreground">
        영양갱 v1.0.0
      </p>
      <p className="text-center text-xs text-muted-foreground pb-4">
        © 2026 영양갱. All rights reserved.
      </p>
    </div>
  );
}
