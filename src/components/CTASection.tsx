import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  const benefits = [
    "건강검진 결과 무료 분석 1회",
    "일일 미션으로 포인트 적립",
    "가족 공유 기능",
    "전문 코치 상담 체험",
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* 메인 메시지 */}
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            지금 바로
            <br />
            <span className="text-primary">영양갱</span>을 시작하세요
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            복잡한 건강 관리는 이제 그만!
            <br />
            카카오톡으로 간편하게 로그인하고 시작하세요.
          </p>

          {/* 혜택 목록 */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border"
              >
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span className="text-base text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild variant="hero" size="touch-lg" className="w-full sm:w-auto">
              <Link to="/auth">
                카카오로 시작하기
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>

          {/* 부가 정보 */}
          <p className="mt-8 text-base text-muted-foreground">
            가입비 무료 • 언제든지 해지 가능
          </p>
        </div>
      </div>
    </section>
  );
}
