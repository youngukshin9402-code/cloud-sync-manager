import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Crown,
  Check,
  X,
  Video,
  Brain,
  Heart,
  Star,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

const plans = [
  {
    id: "basic",
    name: "베이직",
    price: 0,
    priceLabel: "무료",
    description: "건강 관리의 첫 걸음",
    features: [
      { text: "건강검진 AI 분석", included: true },
      { text: "식단 기록 및 피드백", included: true },
      { text: "일일 미션", included: true },
      { text: "포인트 적립", included: true },
      { text: "1:1 코칭 상담", included: false },
      { text: "영상 통화 코칭", included: false },
      { text: "맞춤형 미션 설정", included: false },
      { text: "우선 상담 예약", included: false },
    ],
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 49900,
    priceLabel: "월 49,900원",
    description: "전문 코치와 함께하는 건강 관리",
    popular: true,
    features: [
      { text: "건강검진 AI 분석", included: true },
      { text: "식단 기록 및 피드백", included: true },
      { text: "일일 미션", included: true },
      { text: "포인트 적립 (2배)", included: true },
      { text: "1:1 코칭 상담", included: true },
      { text: "영상 통화 코칭", included: true },
      { text: "맞춤형 미션 설정", included: true },
      { text: "우선 상담 예약", included: true },
    ],
  },
];

export default function Premium() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const currentPlan = profile?.subscription_tier || "basic";

  const handleUpgrade = async () => {
    if (!profile) {
      toast({
        title: "로그인 필요",
        description: "프리미엄 구독을 위해 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setShowPaymentDialog(true);
  };

  const processPayment = async (method: string) => {
    setProcessing(true);

    try {
      // 구독 생성
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: profile!.id,
          payer_id: profile!.id,
          plan_type: "premium",
          price: 49900,
          payment_method: method,
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (subscriptionError) throw subscriptionError;

      // 프로필 업데이트
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ subscription_tier: "premium" })
        .eq("id", profile!.id);

      if (profileError) throw profileError;

      await refreshProfile();

      toast({
        title: "프리미엄 가입 완료! 🎉",
        description: "이제 모든 프리미엄 기능을 이용하실 수 있습니다.",
      });

      setShowPaymentDialog(false);
      navigate("/coaching");
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "결제 실패",
        description: "결제 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">프리미엄 구독</h1>
        </div>
        <p className="text-white/90">전문 코치와 함께 건강을 관리하세요</p>
      </div>

      {/* Current Plan Badge */}
      {currentPlan === "premium" && (
        <div className="px-4 -mt-4">
          <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300">
            <CardContent className="py-4 flex items-center gap-3">
              <Crown className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">프리미엄 회원</p>
                <p className="text-sm text-amber-700">모든 기능을 이용 중입니다</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plans */}
      <div className="p-4 space-y-4 mt-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.popular
                ? "border-2 border-primary shadow-lg"
                : "border-border"
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium rounded-bl-lg">
                <Sparkles className="h-4 w-4 inline mr-1" />
                추천
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-2">
                {plan.id === "premium" ? (
                  <Crown className="h-6 w-6 text-amber-500" />
                ) : (
                  <Heart className="h-6 w-6 text-muted-foreground" />
                )}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.priceLabel}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 ${
                      feature.included ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50" />
                    )}
                    <span className={!feature.included ? "line-through" : ""}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {plan.id === "premium" && currentPlan !== "premium" && (
                <Button
                  className="w-full h-14 text-lg"
                  onClick={handleUpgrade}
                >
                  <Crown className="mr-2 h-5 w-5" />
                  프리미엄 시작하기
                </Button>
              )}

              {plan.id === currentPlan && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  현재 이용 중
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium Benefits */}
      <div className="p-4 mt-4">
        <h2 className="text-xl font-bold mb-4">프리미엄 혜택</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="py-4 text-center">
              <Video className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold text-blue-800">영상 코칭</p>
              <p className="text-sm text-blue-600">전문 코치와 1:1 상담</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="py-4 text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="font-semibold text-purple-800">맞춤 미션</p>
              <p className="text-sm text-purple-600">개인화된 건강 미션</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="py-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-800">2배 포인트</p>
              <p className="text-sm text-green-600">모든 활동에 적용</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="py-4 text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-amber-600" />
              <p className="font-semibold text-amber-800">우선 예약</p>
              <p className="text-sm text-amber-600">인기 시간대 우선 배정</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>결제 수단 선택</DialogTitle>
            <DialogDescription>
              프리미엄 구독 (월 49,900원)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3"
              onClick={() => processPayment("kakaopay")}
              disabled={processing}
            >
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="font-bold text-black">K</span>
              </div>
              <span>카카오페이</span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3"
              onClick={() => processPayment("naverpay")}
              disabled={processing}
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">N</span>
              </div>
              <span>네이버페이</span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3"
              onClick={() => processPayment("card")}
              disabled={processing}
            >
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-600">💳</span>
              </div>
              <span>신용/체크카드</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            구독은 언제든지 취소할 수 있습니다
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
