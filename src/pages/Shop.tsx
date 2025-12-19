import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  MessageSquare,
  Send,
  Clock,
  Star,
  Crown,
  Zap,
  Shield,
  Heart,
  Target,
} from "lucide-react";

type Step = "info" | "request" | "success";

export default function Shop() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("info");
  const [requestForm, setRequestForm] = useState({
    name: "",
    phone: "",
    goal: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRequest = async () => {
    if (!requestForm.name.trim() || !requestForm.phone.trim()) {
      toast({ title: "이름과 연락처를 입력해주세요", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setStep("success");
    toast({ title: "상담 신청이 완료되었습니다!" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-yanggaeng-amber text-primary-foreground p-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step === "info" ? navigate(-1) : setStep("info")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">프리미엄 서비스</h1>
        </div>
        <p className="text-primary-foreground/90">전문가와 함께하는 맞춤 건강 관리</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 프리미엄 안내 */}
        {step === "info" && (
          <>
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-3xl border border-amber-200 dark:border-amber-800 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">영양갱 프리미엄</h2>
                  <p className="text-sm text-amber-700 dark:text-amber-300">1:1 전문가 건강 관리</p>
                </div>
              </div>
              
              <p className="text-amber-800 dark:text-amber-200">
                의사, 트레이너, 영양사 전문가가 직접 관리하는 맞춤 건강 프로그램입니다.
              </p>
            </div>

            {/* 혜택 리스트 */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                프리미엄 혜택
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">1:1 화상 코칭</p>
                    <p className="text-sm text-muted-foreground">주 1회 전문가와 화상 상담</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">맞춤 건강 플랜</p>
                    <p className="text-sm text-muted-foreground">개인별 식단/운동 프로그램 설계</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">건강검진 분석</p>
                    <p className="text-sm text-muted-foreground">전문가의 상세 건강검진 결과 해석</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium">무제한 질문</p>
                    <p className="text-sm text-muted-foreground">카카오톡으로 언제든 질문 가능</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 상담 절차 안내 */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                상담 절차 안내
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>상담 신청 후 담당자가 연락드립니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>무료 상담 후 프로그램을 결정하실 수 있습니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>결제는 상담 후 별도로 안내됩니다</span>
                </li>
              </ul>
            </div>

            {/* CTA 버튼 */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg"
              onClick={() => setStep("request")}
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              무료 상담 신청하기
            </Button>

            {/* 환불 정책 링크 */}
            <div className="text-center pt-2">
              <Link to="/refund-policy" className="text-sm text-muted-foreground underline">
                환불 정책 보기
              </Link>
            </div>
          </>
        )}

        {/* 상담 신청 폼 */}
        {step === "request" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">상담 신청</h2>
            
            <div className="bg-muted/50 rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                상담 절차 안내
              </p>
              <p className="text-sm text-muted-foreground">
                신청 후 1-2일 내로 담당자가 연락드립니다. 부담없이 상담받아보세요!
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">이름 *</label>
                <Input
                  placeholder="홍길동"
                  value={requestForm.name}
                  onChange={(e) => setRequestForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">연락처 *</label>
                <Input
                  placeholder="010-1234-5678"
                  value={requestForm.phone}
                  onChange={(e) => setRequestForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  건강 목표 (선택)
                </label>
                <Input
                  placeholder="예: 체중 감량, 근력 향상, 식습관 개선"
                  value={requestForm.goal}
                  onChange={(e) => setRequestForm(f => ({ ...f, goal: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  추가 요청사항 (선택)
                </label>
                <Textarea
                  placeholder="현재 건강 상태나 궁금한 점을 적어주세요"
                  value={requestForm.message}
                  onChange={(e) => setRequestForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full h-14" 
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
            >
              <Send className="w-5 h-5 mr-2" />
              {isSubmitting ? "신청 중..." : "상담 신청하기"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              상담 신청은 무료이며, 결제가 진행되지 않습니다.
            </p>
          </div>
        )}

        {/* 신청 완료 */}
        {step === "success" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">상담 신청 완료!</h2>
              <p className="text-muted-foreground">
                담당자가 1-2일 내로 연락드리겠습니다
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h3 className="font-semibold">다음 단계</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                  <span>담당자가 전화로 상담 일정을 안내드립니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                  <span>무료 상담을 통해 맞춤 프로그램을 소개받습니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                  <span>마음에 드시면 결제 후 코칭이 시작됩니다</span>
                </li>
              </ol>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">문의가 필요하신가요?</p>
              <p className="text-sm text-muted-foreground">
                support@yanggaeng.kr
              </p>
            </div>

            <Button 
              variant="outline"
              size="lg" 
              className="w-full h-14" 
              onClick={() => navigate("/dashboard")}
            >
              홈으로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
