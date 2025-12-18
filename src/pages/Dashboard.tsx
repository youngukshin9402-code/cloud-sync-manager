import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  Utensils,
  Dumbbell,
  ChevronRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const yanggaengCards = [
  {
    id: "medical",
    title: "의료양갱",
    description: "건강검진 결과를 분석해드려요",
    icon: Stethoscope,
    path: "/medical",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    status: "최근 검진: 없음",
  },
  {
    id: "nutrition",
    title: "영양양갱",
    description: "오늘 뭐 드셨어요?",
    icon: Utensils,
    path: "/nutrition",
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-50",
    status: "오늘 기록: 0회",
  },
  {
    id: "exercise",
    title: "운동양갱",
    description: "오늘의 미션을 완료하세요",
    icon: Dumbbell,
    path: "/exercise",
    color: "from-sky-500 to-blue-600",
    bgColor: "bg-sky-50",
    status: "미션: 0/3 완료",
  },
];

export default function Dashboard() {
  const { profile } = useAuth();

  if (!profile) return null;

  const isGuardian = profile.user_type === "guardian";

  return (
    <div className="space-y-8">
      {/* 인사말 */}
      <section>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          안녕하세요, {profile.nickname}님! 👋
        </h1>
        <p className="text-xl text-muted-foreground">
          {isGuardian
            ? "부모님의 건강 상태를 확인해보세요."
            : "오늘도 건강한 하루 보내세요!"}
        </p>
      </section>

      {/* 오늘의 요약 */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">오늘의 요약</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {profile.current_points.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">포인트</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-accent">0/3</p>
            <p className="text-sm text-muted-foreground">미션</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground">연속일</p>
          </div>
        </div>
      </section>

      {/* 보호자인 경우 - 연결된 부모 표시 */}
      {isGuardian && (
        <section className="bg-card rounded-3xl p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">연결된 가족</h2>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg mb-4">아직 연결된 가족이 없어요.</p>
            <Link
              to="/profile/connect"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              부모님 계정 연결하기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* 3개의 양갱 카드 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">3가지 양갱</h2>
        <div className="space-y-4">
          {yanggaengCards.map((card) => (
            <Link
              key={card.id}
              to={card.path}
              className={cn(
                "block rounded-3xl p-6 transition-all hover:shadow-lg hover:-translate-y-1",
                card.bgColor
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                    card.color
                  )}
                >
                  <card.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground">{card.description}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {card.status}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 프리미엄 안내 */}
      {profile.subscription_tier === "basic" && (
        <section className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-primary-foreground">
          <div className="flex items-start gap-4">
            <TrendingUp className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                프리미엄으로 업그레이드
              </h3>
              <p className="text-primary-foreground/80 mb-4">
                전문 코치와 1:1 영상 상담을 받아보세요.
              </p>
              <Link
                to="/premium"
                className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                자세히 보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
