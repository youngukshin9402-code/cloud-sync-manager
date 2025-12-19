import { YanggaengCard } from "./YanggaengCard";
import { Stethoscope, Utensils, Dumbbell } from "lucide-react";
import { useDailyData } from "@/contexts/DailyDataContext";

export function YanggaengSection() {
  const { todayCalories, todayWater } = useDailyData();
  const showTodaySummary = todayCalories > 0 || todayWater > 0;

  return (
    <section id="yanggaengs" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* 섹션 헤더 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            3가지 <span className="text-primary">양갱</span>으로
            <br />
            건강을 관리하세요
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            의료, 영양, 운동 - 세 가지 영역의 건강을
            <br />
            한 곳에서 쉽고 재미있게 관리할 수 있어요.
          </p>

          {showTodaySummary && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm">
                <span className="text-muted-foreground">오늘 섭취</span>{" "}
                <span className="font-semibold text-foreground">{todayCalories.toLocaleString()}kcal</span>
              </span>
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm">
                <span className="text-muted-foreground">오늘 물</span>{" "}
                <span className="font-semibold text-foreground">{todayWater.toLocaleString()}ml</span>
              </span>
            </div>
          )}
        </div>

        {/* 3개의 양갱 카드 */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <YanggaengCard
            title="의료양갱"
            description="건강검진 결과를 사진으로 찍으면 AI가 쉬운 말로 설명해드려요."
            icon={Stethoscope}
            color="health"
            to="/medical"
            features={[
              "건강검진 결과 자동 분석",
              "쉬운 용어로 설명",
              "건강 나이 측정",
              "가족에게 공유하기",
            ]}
            delay={0}
          />

          <YanggaengCard
            title="영양양갱"
            description="식사 사진을 찍으면 바로 영양 피드백을 받을 수 있어요."
            icon={Utensils}
            color="nutrition"
            to="/nutrition"
            features={[
              "음식 사진 분석",
              "나트륨/당 체크",
              "맞춤 식단 추천",
              "영양 점수 확인",
            ]}
            delay={100}
          />

          <YanggaengCard
            title="운동양갱"
            description="매일 3가지 미션을 완료하고 포인트를 모아보세요."
            icon={Dumbbell}
            color="exercise"
            to="/exercise"
            features={["일일 미션 3개", "원터치 완료", "포인트 적립", "주간 리포트"]}
            delay={200}
          />
        </div>
      </div>
    </section>
  );
}
