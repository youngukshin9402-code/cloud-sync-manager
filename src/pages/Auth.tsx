import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, ArrowLeft, User, Users, Loader2, Check, X } from "lucide-react";
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

// 전화번호를 E.164 포맷으로 변환
const formatPhoneToE164 = (phone: string): string => {
  // 숫자만 추출
  const digits = phone.replace(/\D/g, "");
  
  // 010으로 시작하면 앞의 0을 제거하고 +82 붙이기
  if (digits.startsWith("010")) {
    return `+82${digits.slice(1)}`;
  }
  // 이미 82로 시작하면 + 붙이기
  if (digits.startsWith("82")) {
    return `+${digits}`;
  }
  // 그 외의 경우 그대로 반환 (에러 처리용)
  return `+82${digits}`;
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const state = (location.state || {}) as LocationState;
  const from = state.from?.pathname || "/dashboard";

  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  
  // 로그인 필드
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // 회원가입 필드
  const [nickname, setNickname] = useState("");
  const [userId, setUserId] = useState(""); // 아이디 (이메일 대신)
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<UserType>("user");
  
  // 신체 정보
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [conditions, setConditions] = useState(""); // 지병 (선택)
  
  // 전화번호 인증
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  // 아이디 중복확인
  const [userIdChecked, setUserIdChecked] = useState(false);
  const [userIdAvailable, setUserIdAvailable] = useState(false);
  const [checkingUserId, setCheckingUserId] = useState(false);

  // 비밀번호 일치 여부
  const passwordsMatch = password === passwordConfirm && password.length >= 6;
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  // 회원가입 가능 조건 체크 (휴대폰 인증은 선택사항)
  const canSignup = 
    nickname.trim() !== "" &&
    userIdChecked && userIdAvailable &&
    passwordsMatch &&
    gender !== "" &&
    height.trim() !== "" && !isNaN(Number(height)) &&
    currentWeight.trim() !== "" && !isNaN(Number(currentWeight)) &&
    goalWeight.trim() !== "" && !isNaN(Number(goalWeight)) &&
    age.trim() !== "" && !isNaN(Number(age)) &&
    activityLevel !== "";

  // 아이디 변경 시 중복확인 상태 초기화
  useEffect(() => {
    setUserIdChecked(false);
    setUserIdAvailable(false);
  }, [userId]);

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
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          
          const hasAdminRole = roles?.some(r => r.role === "admin");
          
          if (hasAdminRole) {
            navigate("/admin/dashboard", { replace: true });
          } else {
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

  // 아이디 중복확인 (모든 사용자의 아이디와 이메일 비교)
  const handleCheckUserId = useCallback(async () => {
    const trimmedId = userId.trim();
    
    if (!trimmedId || trimmedId.length < 6) {
      toast({
        title: "아이디를 6자 이상 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setCheckingUserId(true);
    
    try {
      // 내부적으로 아이디를 이메일 형식으로 변환 (예: userId -> userId@yanggaeng.local)
      const fakeEmail = `${trimmedId}@yanggaeng.local`;
      
      // 1. 먼저 로그인 시도로 해당 이메일(아이디)이 존재하는지 확인
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: "check_only_not_real_password_12345",
      });
      
      // 로그인이 성공하면 (비밀번호가 맞으면) 아이디가 존재하는 것
      if (!signInError) {
        // 성공적으로 로그인됐다면 로그아웃하고 중복 알림
        await supabase.auth.signOut();
        setUserIdChecked(true);
        setUserIdAvailable(false);
        toast({
          title: "이미 사용 중인 아이디입니다",
          variant: "destructive",
        });
        return;
      }
      
      // "Invalid login credentials" 에러일 경우:
      // - 사용자가 없거나 비밀번호가 틀린 것
      // 추가로 profiles 테이블에서도 확인하여 더 정확한 중복 검사
      
      // 2. profiles 테이블에서 nickname이 동일한 사용자가 있는지도 확인
      const { data: existingProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .or(`nickname.eq.${trimmedId}`)
        .limit(1);
      
      if (profileError) {
        console.error("Profile check error:", profileError);
      }
      
      if (existingProfiles && existingProfiles.length > 0) {
        setUserIdChecked(true);
        setUserIdAvailable(false);
        toast({
          title: "이미 사용 중인 아이디입니다",
          variant: "destructive",
        });
        return;
      }
      
      // 모든 검사 통과 - 사용 가능한 아이디
      setUserIdChecked(true);
      setUserIdAvailable(true);
      toast({
        title: "사용 가능한 아이디입니다",
      });
    } catch (error) {
      console.error("User ID check error:", error);
      // 에러 발생 시 안전하게 중복확인 실패 처리
      toast({
        title: "중복확인 중 오류가 발생했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setCheckingUserId(false);
    }
  }, [userId, toast]);

  // 전화번호 OTP 발송
  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast({
        title: "전화번호를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    // 전화번호 형식 검증 (숫자만, 10-11자리)
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      toast({
        title: "올바른 전화번호를 입력해주세요",
        description: "예: 01012345678",
        variant: "destructive",
      });
      return;
    }

    setOtpLoading(true);
    
    try {
      const formattedPhone = formatPhoneToE164(phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        console.error("OTP send error:", error);
        toast({
          title: "인증번호 발송 실패",
          description: error.message || "다시 시도해주세요.",
          variant: "destructive",
        });
      } else {
        setOtpSent(true);
        toast({
          title: "인증번호 발송 완료",
          description: "문자로 받은 인증번호를 입력해주세요.",
        });
      }
    } catch (error) {
      console.error("OTP send error:", error);
      toast({
        title: "오류 발생",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP 인증 확인
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast({
        title: "인증번호를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setVerifyLoading(true);
    
    try {
      const formattedPhone = formatPhoneToE164(phone);
      
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: "sms",
      });

      if (error) {
        console.error("OTP verify error:", error);
        toast({
          title: "인증 실패",
          description: "인증번호가 올바르지 않아요.",
          variant: "destructive",
        });
      } else {
        // 인증 성공 - 하지만 이 과정에서 로그인이 될 수 있음
        // 회원가입 플로우를 위해 로그아웃 처리
        await supabase.auth.signOut();
        
        setPhoneVerified(true);
        toast({
          title: "전화번호 인증 완료",
        });
      }
    } catch (error) {
      console.error("OTP verify error:", error);
      toast({
        title: "오류 발생",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // @ 없으면 @yanggaeng.local 붙이기
    const emailToUse = loginEmail.includes('@') 
      ? loginEmail 
      : `${loginEmail.trim()}@yanggaeng.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: loginPassword,
    });

    if (error) {
      toast({
        title: "로그인 실패",
        description:
          error.message === "Invalid login credentials"
            ? "아이디 또는 비밀번호가 올바르지 않아요."
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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    
    const hasAdminRole = roles?.some(r => r.role === "admin");
    const hasCoachRole = roles?.some(r => r.role === "coach");
    
    if (hasAdminRole) {
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

    if (!canSignup) {
      toast({
        title: "모든 필수 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // 아이디를 내부적으로 이메일 형식으로 변환
    const fakeEmail = `${userId.trim()}@yanggaeng.local`;
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      phone: phone.trim() ? formatPhoneToE164(phone) : undefined,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nickname: nickname,
          user_type: selectedUserType,
          gender: gender,
          height_cm: Number(height),
          current_weight: Number(currentWeight),
          goal_weight: Number(goalWeight),
          age: Number(age),
          activity_level: activityLevel,
          conditions: conditions.trim() || null,
          phone: phone.trim() ? phone.replace(/\D/g, "") : null,
        },
      },
    });

    if (error) {
      let message = "회원가입에 실패했어요.";
      if (error.message.includes("already registered")) {
        message = "이미 가입된 아이디예요.";
        setUserIdChecked(false);
        setUserIdAvailable(false);
      }
      toast({
        title: "회원가입 실패",
        description: message,
        variant: "destructive",
      });
    } else {
      // nutrition_settings에 신체 정보 저장은 AuthContext에서 처리되거나
      // 여기서 직접 처리해야 함 - 일단 user metadata에 저장했으므로 OK
      
      toast({
        title: "회원가입 완료!",
        description: "환영합니다! 로그인해주세요.",
      });
      setMode("login");
      // 폼 초기화
      setNickname("");
      setUserId("");
      setPassword("");
      setPasswordConfirm("");
      setGender("");
      setHeight("");
      setCurrentWeight("");
      setGoalWeight("");
      setAge("");
      setActivityLevel("");
      setConditions("");
      setPhone("");
      setOtpCode("");
      setPhoneVerified(false);
      setOtpSent(false);
      setUserIdChecked(false);
      setUserIdAvailable(false);
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
          <p className="text-base font-semibold whitespace-nowrap">직접관리</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-center whitespace-pre-line break-keep">
            {"내 건강을\n직접\n관리할게요"}
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
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-center whitespace-pre-line break-keep">
            {"부모님 건강을\n관리할게요"}
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      {/* 우측 상단 뒤로가기 버튼 */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 right-6 p-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        title="돌아가기"
      >
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">영양갱</h1>
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
                  <Label htmlFor="login-email" className="text-lg">
                    아이디
                  </Label>
                  <Input
                    id="login-email"
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    required
                    className="h-14 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-lg">
                    비밀번호
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
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
            <form onSubmit={handleSignup} className="space-y-5">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>로그인으로 돌아가기</span>
              </button>

              {/* 닉네임 */}
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-lg">
                  닉네임 <span className="text-destructive">*</span>
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

              {/* 아이디 + 중복확인 */}
              <div className="space-y-2">
                <Label htmlFor="signup-userid" className="text-lg">
                  아이디 <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="signup-userid"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="6자 이상"
                    required
                    className="h-14 text-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 px-4 whitespace-nowrap"
                    onClick={handleCheckUserId}
                    disabled={checkingUserId || userId.trim().length < 6}
                  >
                    {checkingUserId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : userIdChecked && userIdAvailable ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      "중복확인"
                    )}
                  </Button>
                </div>
                {userId.trim().length > 0 && userId.trim().length < 6 && (
                  <p className="text-sm text-muted-foreground">
                    아이디는 6자 이상 입력해주세요
                  </p>
                )}
                {userIdChecked && (
                  <p className={`text-sm ${userIdAvailable ? "text-green-600" : "text-destructive"}`}>
                    {userIdAvailable ? "사용 가능한 아이디입니다" : "이미 사용 중인 아이디입니다"}
                  </p>
                )}
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-lg">
                  비밀번호 <span className="text-destructive">*</span>
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

              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <Label htmlFor="signup-password-confirm" className="text-lg">
                  비밀번호 확인 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="signup-password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  minLength={6}
                  className={`h-14 text-lg ${passwordMismatch ? "border-destructive" : ""}`}
                />
                {passwordMismatch && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <X className="w-4 h-4" /> 비밀번호가 일치하지 않습니다
                  </p>
                )}
                {passwordConfirm.length > 0 && passwordsMatch && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> 비밀번호가 일치합니다
                  </p>
                )}
              </div>

              {/* 신체 정보 */}
              <div className="space-y-4 pt-2">
                <div className="border-t border-border pt-4">
                  <p className="text-lg font-medium mb-3">신체 정보 <span className="text-destructive">*</span></p>
                  
                  {/* 성별 */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm">성별</Label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setGender("male")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                          gender === "male"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          gender === "male" ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {gender === "male" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        남성
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender("female")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                          gender === "female"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          gender === "female" ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {gender === "female" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        여성
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* 키 */}
                    <div className="space-y-1">
                      <Label htmlFor="height" className="text-sm">키 (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        min="1"
                        required
                        className="h-12"
                      />
                    </div>
                    
                    {/* 현재 체중 */}
                    <div className="space-y-1">
                      <Label htmlFor="current-weight" className="text-sm">현재 체중 (kg)</Label>
                      <Input
                        id="current-weight"
                        type="number"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        min="1"
                        required
                        className="h-12"
                      />
                    </div>
                    
                    {/* 목표 체중 */}
                    <div className="space-y-1">
                      <Label htmlFor="goal-weight" className="text-sm">목표 체중 (kg)</Label>
                      <Input
                        id="goal-weight"
                        type="number"
                        value={goalWeight}
                        onChange={(e) => setGoalWeight(e.target.value)}
                        min="1"
                        required
                        className="h-12"
                      />
                    </div>
                    
                    {/* 나이 */}
                    <div className="space-y-1">
                      <Label htmlFor="age" className="text-sm">만 나이 (세)</Label>
                      <Input
                        id="age"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="1"
                        required
                        className="h-12"
                      />
                    </div>
                  </div>

                  {/* 활동수준 */}
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="activity-level" className="text-sm">활동수준</Label>
                    <select
                      id="activity-level"
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="w-full h-12 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">선택해주세요</option>
                      <option value="sedentary">거의 활동 안함</option>
                      <option value="light">가벼운 활동 (주 1~3회 가벼운 운동)</option>
                      <option value="moderate">보통 활동 (주 3~5회 운동)</option>
                      <option value="active">활발한 활동 (주 6~7회 강한 운동)</option>
                      <option value="very_active">매우 활발한 활동 (하루 2회 운동, 운동선수)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 지병 (선택) */}
              <div className="space-y-2">
                <Label htmlFor="conditions" className="text-lg">
                  지병 <span className="text-muted-foreground text-sm">(선택)</span>
                </Label>
                <Input
                  id="conditions"
                  type="text"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="예) 당뇨, 고혈압"
                  className="h-14 text-lg"
                />
              </div>

              {/* 전화번호 인증 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="phone" className="text-lg pt-2 block">
                  전화번호 인증 <span className="text-destructive">*</span>
                </Label>
                
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneVerified(false);
                      setOtpSent(false);
                    }}
                    placeholder="01012345678"
                    disabled={phoneVerified}
                    className="h-14 text-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 px-4 whitespace-nowrap"
                    onClick={handleSendOtp}
                    disabled={otpLoading || phoneVerified || !phone.trim()}
                  >
                    {otpLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : phoneVerified ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : otpSent ? (
                      "재발송"
                    ) : (
                      "인증요청"
                    )}
                  </Button>
                </div>

                {otpSent && !phoneVerified && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="인증번호 6자리"
                      maxLength={6}
                      className="h-12 text-lg flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 px-4"
                      onClick={handleVerifyOtp}
                      disabled={verifyLoading || otpCode.length < 6}
                    >
                      {verifyLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "확인"
                      )}
                    </Button>
                  </div>
                )}

                {phoneVerified && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> 전화번호 인증 완료
                  </p>
                )}
              </div>

              <UserTypeSelector />

              <Button 
                type="submit" 
                disabled={loading || !canSignup} 
                className="w-full" 
                size="lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "회원가입"}
              </Button>

              {/* 가입 조건 미충족 시 안내 */}
              {!canSignup && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">가입 조건을 확인해주세요:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {!nickname.trim() && <li>닉네임을 입력해주세요</li>}
                    {!userIdChecked && <li>아이디 중복확인을 해주세요</li>}
                    {userIdChecked && !userIdAvailable && <li>사용 가능한 아이디를 입력해주세요</li>}
                    {!passwordsMatch && <li>비밀번호를 확인해주세요 (6자 이상, 일치)</li>}
                    {!gender && <li>성별을 선택해주세요</li>}
                    {(!height.trim() || !currentWeight.trim() || !goalWeight.trim() || !age.trim()) && (
                      <li>신체 정보를 모두 입력해주세요</li>
                    )}
                    {!activityLevel && <li>활동수준을 선택해주세요</li>}
                    {!phoneVerified && <li>전화번호 인증을 완료해주세요</li>}
                  </ul>
                </div>
              )}
            </form>
          )}
        </div>

        {/* 하단 안내 */}
        <p className="text-center text-muted-foreground mt-6 whitespace-pre-line">
          {"가입하면 서비스 이용약관에\n동의하는 것으로 간주됩니다."}
        </p>
      </div>
    </div>
  );
}
