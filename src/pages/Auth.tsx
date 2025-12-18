import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, ArrowLeft, User, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup";
type UserType = "user" | "guardian";

type LocationState = {
  from?: { pathname?: string };
};

// Kakao icon component
const KakaoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.88 1.92 5.4 4.8 6.84-.21.78-.78 2.82-.89 3.27-.14.54.2.53.42.39.17-.11 2.73-1.85 3.84-2.6.59.09 1.21.14 1.83.14 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const state = (location.state || {}) as LocationState;
  const from = state.from?.pathname || "/dashboard";

  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<UserType>("user");

  // Check for auth state changes (for OAuth callbacks)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        toast({
          title: "환영합니다!",
          description: "로그인에 성공했어요.",
        });
        
        // 역할 확인 후 적절한 페이지로 리다이렉트
        setTimeout(async () => {
          // admin 이메일 패턴 체크
          const isAdminEmail = /^admin@s23270351.*\.com$/.test(session.user.email || "");
          
          // user_roles 테이블에서 admin 역할 확인
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          
          const hasAdminRole = roles?.some(r => r.role === "admin");
          
          if (isAdminEmail || hasAdminRole) {
            navigate("/admin/dashboard", { replace: true });
          } else {
            // coach 역할 체크
            const hasCoachRole = roles?.some(r => r.role === "coach");
            if (hasCoachRole) {
              navigate("/coach/dashboard", { replace: true });
            } else {
              navigate(from, { replace: true });
            }
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast, from]);

  const handleKakaoLogin = async () => {
    setKakaoLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}${from}`,
        },
      });

      if (error) {
        toast({
          title: "카카오 로그인 실패",
          description: "다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "오류 발생",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setKakaoLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "로그인 실패",
        description:
          error.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 올바르지 않아요."
            : "다시 시도해주세요.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    toast({
      title: "환영합니다!",
      description: "로그인에 성공했어요.",
    });

    // 역할 확인 후 적절한 페이지로 리다이렉트
    const isAdminEmail = /^admin@s23270351.*\.com$/.test(email);
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    
    const hasAdminRole = roles?.some(r => r.role === "admin");
    const hasCoachRole = roles?.some(r => r.role === "coach");
    
    if (isAdminEmail || hasAdminRole) {
      navigate("/admin/dashboard", { replace: true });
    } else if (hasCoachRole) {
      navigate("/coach/dashboard", { replace: true });
    } else {
      navigate(from, { replace: true });
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      toast({
        title: "닉네임을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nickname: nickname,
          user_type: selectedUserType,
        },
      },
    });

    if (error) {
      let message = "회원가입에 실패했어요.";
      if (error.message.includes("already registered")) {
        message = "이미 가입된 이메일이에요.";
      }
      toast({
        title: "회원가입 실패",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "회원가입 완료!",
        description: "환영합니다! 로그인해주세요.",
      });
      setMode("login");
      setPassword("");
    }
    setLoading(false);
  };

  const UserTypeSelector = () => (
    <div className="space-y-4">
      <Label className="text-lg">어떻게 사용하실 건가요?</Label>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setSelectedUserType("user")}
          className={`p-6 rounded-2xl border-2 transition-all ${
            selectedUserType === "user"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          }`}
        >
          <User className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold">직접 관리</p>
          <p className="text-sm text-muted-foreground mt-1">
            내 건강을 직접 관리할게요
          </p>
        </button>
        <button
          type="button"
          onClick={() => setSelectedUserType("guardian")}
          className={`p-6 rounded-2xl border-2 transition-all ${
            selectedUserType === "guardian"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          }`}
        >
          <Users className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold">보호자</p>
          <p className="text-sm text-muted-foreground mt-1">
            부모님 건강을 관리할게요
          </p>
        </button>
      </div>
    </div>
  );

  const SocialLoginButtons = () => (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-4 text-muted-foreground">또는</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full h-14 text-lg bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] border-none"
        onClick={handleKakaoLogin}
        disabled={kakaoLoading}
      >
        {kakaoLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <KakaoIcon />
        )}
        <span className="ml-2">카카오로 시작하기</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">건강양갱</h1>
          <p className="text-lg text-muted-foreground mt-2">
            {mode === "login" ? "다시 만나서 반가워요!" : "새로운 시작을 환영해요!"}
          </p>
        </div>

        {/* 폼 */}
        <div className="bg-card rounded-3xl p-8 shadow-card border border-border">
          {mode === "login" ? (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-lg">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="h-14 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-lg">
                    비밀번호
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                    className="h-14 text-lg"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
                </Button>
              </form>

              <SocialLoginButtons />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-lg text-primary hover:underline"
                >
                  계정이 없으신가요? <span className="font-semibold">회원가입</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>로그인으로 돌아가기</span>
              </button>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-lg">
                  닉네임
                </Label>
                <Input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="어떻게 불러드릴까요?"
                  required
                  className="h-14 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-lg">
                  이메일
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="h-14 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-lg">
                  비밀번호
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  required
                  minLength={6}
                  className="h-14 text-lg"
                />
              </div>

              <UserTypeSelector />

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "회원가입"}
              </Button>

              <SocialLoginButtons />
            </form>
          )}
        </div>

        {/* 하단 안내 */}
        <p className="text-center text-muted-foreground mt-6">
          가입하면 서비스 이용약관에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
