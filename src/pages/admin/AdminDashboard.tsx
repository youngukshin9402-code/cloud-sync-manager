import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCog,
  FileText,
  ShoppingBag,
  Coins,
  BarChart3,
  TrendingUp,
  Crown,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  {
    id: "users",
    icon: Users,
    label: "사용자 관리",
    description: "전체 사용자 조회 및 관리",
    path: "/admin/users",
    count: "1,234명",
  },
  {
    id: "coaches",
    icon: UserCog,
    label: "코치 관리",
    description: "코치 계정 생성 및 배정",
    path: "/admin/coaches",
    count: "8명",
  },
  {
    id: "health-records",
    icon: FileText,
    label: "건강검진 승인",
    description: "검진 결과 최종 승인/반려",
    path: "/admin/health-records",
    count: "23건 대기",
    highlight: true,
  },
  {
    id: "products",
    icon: ShoppingBag,
    label: "상품 관리",
    description: "커머스 상품 등록/수정",
    path: "/admin/products",
    count: "42개",
  },
  {
    id: "points",
    icon: Coins,
    label: "포인트 정책",
    description: "적립 기준 및 프로모션",
    path: "/admin/points",
  },
  {
    id: "stats",
    icon: BarChart3,
    label: "통계",
    description: "서비스 지표 및 분석",
    path: "/admin/stats",
  },
];

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground">
              건강양갱 서비스 관리
            </p>
          </div>
          <Button variant="ghost" onClick={signOut}>
            로그아웃
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* 오늘의 현황 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">전체 회원</span>
            </div>
            <p className="text-2xl font-bold">1,234</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +12 오늘
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">프리미엄</span>
            </div>
            <p className="text-2xl font-bold">156</p>
            <p className="text-xs text-muted-foreground mt-1">12.6%</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-sky-500" />
              <span className="text-sm text-muted-foreground">오늘 업로드</span>
            </div>
            <p className="text-2xl font-bold">34</p>
            <p className="text-xs text-amber-600 mt-1">23건 검토 대기</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">오늘 매출</span>
            </div>
            <p className="text-2xl font-bold">₩2.4M</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +15%
            </p>
          </div>
        </div>

        {/* 메뉴 그리드 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">관리 메뉴</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`bg-card rounded-2xl border p-6 hover:shadow-lg transition-all ${
                  item.highlight
                    ? "border-amber-300 bg-amber-50"
                    : "border-border hover:border-primary"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      item.highlight ? "bg-amber-200" : "bg-primary/10"
                    }`}
                  >
                    <item.icon
                      className={`w-6 h-6 ${
                        item.highlight ? "text-amber-700" : "text-primary"
                      }`}
                    />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mt-4">{item.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
                {item.count && (
                  <p
                    className={`text-sm font-medium mt-2 ${
                      item.highlight ? "text-amber-700" : "text-primary"
                    }`}
                  >
                    {item.count}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* 최근 활동 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">최근 활동</h2>
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="space-y-4">
              {[
                { time: "10분 전", action: "홍길동님이 건강검진 결과를 업로드했습니다." },
                { time: "30분 전", action: "김영희님이 프리미엄을 구독했습니다." },
                { time: "1시간 전", action: "새로운 코치(이코치)가 등록되었습니다." },
                { time: "2시간 전", action: "박철수님의 건강검진이 승인되었습니다." },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-foreground">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
