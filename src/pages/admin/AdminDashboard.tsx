import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  ClipboardList,
  Video,
  MessageSquare,
  Brain,
  ClipboardCheck,
  CreditCard,
} from "lucide-react";

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { stats, loading } = useAdminData();

  const menuItems = [
    {
      id: "users",
      icon: Users,
      label: "사용자 관리",
      description: "전체 사용자 조회 및 역할 관리",
      path: "/admin/users",
      count: `${stats.totalUsers.toLocaleString()}명`,
    },
    {
      id: "consultations",
      icon: ClipboardList,
      label: "상담신청 내역",
      description: "2주 무료체험 상담 신청 목록",
      path: "/admin/consultations",
    },
    {
      id: "coaching",
      icon: Video,
      label: "코칭 관리",
      description: "코칭 신청 목록 및 코치 배정",
      path: "/admin/coaching",
    },
    {
      id: "coaches",
      icon: UserCog,
      label: "코치 관리",
      description: "코치 계정 생성 및 배정",
      path: "/admin/coaches",
    },
    {
      id: "tickets",
      icon: MessageSquare,
      label: "고객 문의",
      description: "티켓 상태 관리 및 답변",
      path: "/admin/tickets",
    },
    {
      id: "health-reviews",
      icon: Brain,
      label: "AI 분석 검토",
      description: "건강검진 AI 분석 검토/코멘트",
      path: "/admin/health-reviews",
    },
    {
      id: "stats",
      icon: BarChart3,
      label: "통계",
      description: "서비스 지표 및 분석",
      path: "/admin/stats",
    },
    {
      id: "chats",
      icon: MessageSquare,
      label: "채팅 모니터링",
      description: "사용자-코치 대화 열람",
      path: "/admin/chats",
    },
    {
      id: "checkin-reports",
      icon: ClipboardCheck,
      label: "체크인 리포트",
      description: "사용자 일일 체크인 리포트 조회",
      path: "/admin/checkin-reports",
    },
    {
      id: "payments",
      icon: CreditCard,
      label: "결제관리",
      description: "결제 현황 및 환불 관리",
      path: "/admin/payments",
    },
  ];
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

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
            <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +{stats.todaySignups} 오늘
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">프리미엄</span>
            </div>
            <p className="text-2xl font-bold">{stats.premiumUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalUsers > 0
                ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-sky-500" />
              <span className="text-sm text-muted-foreground">오늘 업로드</span>
            </div>
            <p className="text-2xl font-bold">{stats.todayUploads}</p>
            <p className="text-xs text-amber-600 mt-1">
              {stats.pendingReviews}건 검토 대기
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">활성 구독</span>
            </div>
            <p className="text-2xl font-bold">{stats.premiumUsers}</p>
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
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mt-4">{item.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
                {item.count && (
                  <p className="text-sm font-medium mt-2 text-primary">
                    {item.count}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
