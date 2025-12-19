import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* 로고 */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-soft">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="text-xl font-bold text-foreground">영양갱</span>
            <p className="text-sm text-muted-foreground">Yanggaeng</p>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            서비스 소개
          </a>
          <a
            href="#yanggaengs"
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            3가지 양갱
          </a>
          <a
            href="#benefits"
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            특징
          </a>
        </nav>

        {/* CTA 버튼 */}
        <Button asChild variant="yanggaeng" size="lg">
          <Link to="/auth">시작하기</Link>
        </Button>
      </div>
    </header>
  );
}
