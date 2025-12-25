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
            의료, 영양, 운동
            <br />
            세 가지 영역의 건강을
            <br />
            한 곳에서 쉽고 재미있게
            <br />
            관리할 수 있어요.
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
            title="건강양갱"
            description={
              <>
                결과를 이해하는데서 끝나지 않고<br />
                실천할 수 있게 챙겨드려요
              </>
            }
            icon={Stethoscope}
            color="health"
            to="/medical"
            features={[
              "검진 결과 쉬운 말로 설명",
              "생활습관 맞춤 코칭",
              "다음에 도움될 검사, 영양제 안내",
            ]}
            delay={0}
          />

          <YanggaengCard
            title="영양양갱"
            description={
              <>
                먹은 걸 적는 것만으로도<br />
                식사는 달라지기 시작해요
              </>
            }
            icon={Utensils}
            color="nutrition"
            to="/nutrition"
            features={[
              "음식 사진 기록",
              "식사 흐름 확인",
              "코치와 함께 피드백",
            ]}
            delay={100}
          />

          <YanggaengCard
            title="운동양갱"
            description={
              <>
                오늘 운동을 삶에 넣으셨어요<br />
                그것만으로도 충분히 의미 있어요
              </>
            }
            icon={Dumbbell}
            color="exercise"
            to="/exercise"
            features={[
              "운동 기록",
              "주간 운동 안내",
              "코치와 함께 관리",
            ]}
            delay={200}
          />
        </div>
      </div>
    </section>
  );
}
