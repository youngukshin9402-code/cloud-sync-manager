import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* 배지 */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary mb-8 animate-fade-in">
            <Sparkles className="w-5 h-5" />
            <span className="text-lg font-medium">시니어를 위한 맞춤 건강 관리</span>
          </div>

          {/* 메인 타이틀 */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-tight animate-slide-up">
            건강도{" "}
            <span className="text-primary relative">
              양갱
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                <path
                  d="M2 8C50 2 150 2 198 8"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="opacity-30"
                />
              </svg>
            </span>
            처럼
            <br />
            달콤하게
          </h1>

          {/* 서브 타이틀 */}
          <p
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            복잡한 건강 데이터를 쉽게 이해하고,
            <br className="hidden md:block" />
            매일 작은 습관으로 건강을 관리하세요.
          </p>

          {/* CTA 버튼들 */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            <Button asChild variant="hero" size="touch-lg">
              <Link to="/auth">
                무료로 시작하기
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>

          {/* 신뢰 지표 */}
          <div
            className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in"
            style={{ animationDelay: "400ms" }}
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              <Shield className="w-6 h-6 text-accent" />
              <span className="text-lg">개인정보 안전 보호</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="w-6 h-6 text-accent" />
              <span className="text-lg">전문 코치 상담</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Sparkles className="w-6 h-6 text-accent" />
              <span className="text-lg">AI 맞춤 분석</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
