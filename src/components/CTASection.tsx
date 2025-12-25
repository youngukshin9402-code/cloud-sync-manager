import { CheckCircle2 } from "lucide-react";

export function CTASection() {
  const benefits = [
    "일일 미션으로 포인트 적립",
    "전문 코치 상담 체험",
    "운동 기록",
    "식단 기록",
    "건강검진 및 인바디 분석",
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* 메인 메시지 */}
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            <span className="whitespace-nowrap">지금 바로 <span className="text-primary">영양갱</span>을</span>
            <br />
            시작하세요
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            복잡한 건강 관리는 이제 그만!
            <br />
            카카오톡으로 간편하게 로그인하고
            <br />
            시작하세요.
          </p>

          {/* 혜택 목록 */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border"
              >
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-base text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
