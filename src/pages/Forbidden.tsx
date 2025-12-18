import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, Home, ArrowLeft } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-24 h-24 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-12 h-12 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">접근 권한 없음</h1>
          <p className="text-lg text-muted-foreground">
            이 페이지에 접근할 권한이 없습니다.<br />
            올바른 계정으로 로그인했는지 확인해 주세요.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/dashboard">
              <Home className="w-5 h-5 mr-2" />
              홈으로 이동
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/auth">
              <ArrowLeft className="w-5 h-5 mr-2" />
              다른 계정으로 로그인
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
