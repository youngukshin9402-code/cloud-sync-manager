import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useOrdersServer } from "@/hooks/useServerSync";
import {
  ArrowLeft,
  ShoppingBag,
  Check,
  MessageSquare,
  Send,
  Phone,
  Mail,
  Clock,
  Users,
  Target,
  Heart,
} from "lucide-react";

type ProductType = "doctor" | "trainer" | "nutritionist";
type Step = "list" | "request" | "success";

interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  price: number;
  duration: string;
  features: string[];
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "의사 1:1 건강 코칭",
    type: "doctor",
    description: "전문 의사와 함께하는 맞춤 건강 관리",
    price: 150000,
    duration: "4주",
    features: [
      "주 1회 1:1 화상 코칭",
      "건강검진 결과 분석",
      "맞춤 건강 관리 플랜",
      "카카오톡 질문 무제한",
    ],
  },
  {
    id: "2",
    name: "트레이너 1:1 운동 코칭",
    type: "trainer",
    description: "전문 트레이너와 함께하는 맞춤 운동 프로그램",
    price: 100000,
    duration: "4주",
    features: [
      "주 1회 1:1 화상 코칭",
      "맞춤 운동 프로그램 설계",
      "운동 자세 피드백",
      "매일 미션 관리",
    ],
  },
  {
    id: "3",
    name: "영양사 1:1 식단 코칭",
    type: "nutritionist",
    description: "전문 영양사와 함께하는 맞춤 식단 관리",
    price: 80000,
    duration: "4주",
    features: [
      "주 1회 1:1 화상 코칭",
      "식단 분석 및 피드백",
      "맞춤 식단 플랜 제공",
      "식사 기록 코멘트",
    ],
  },
];

export default function Shop() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { add: addOrder, syncing } = useOrdersServer();

  const [step, setStep] = useState<Step>("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [requestForm, setRequestForm] = useState({
    name: "",
    phone: "",
    goal: "",
    message: "",
  });

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setStep("request");
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.name.trim() || !requestForm.phone.trim()) {
      toast({ title: "이름과 연락처를 입력해주세요", variant: "destructive" });
      return;
    }

    if (!selectedProduct) return;

    // Create order with 'requested' status
    const result = await addOrder({
      product_name: selectedProduct.name,
      product_type: selectedProduct.type,
      price: selectedProduct.price,
      payment_method: "external", // External payment
    });

    if (result.error) {
      toast({ title: "요청 실패", variant: "destructive" });
      return;
    }

    setStep("success");
    toast({ title: "신청이 완료되었습니다!" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step === "list" ? navigate(-1) : setStep("list")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">1:1 코칭 신청</h1>
        </div>
        <p className="text-white/90">전문가와 함께하는 맞춤 건강 관리</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 상품 목록 */}
        {step === "list" && (
          <>
            {/* 서비스 안내 */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                1:1 코칭 서비스 안내
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>상담 신청 후 담당자가 연락드립니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>결제는 상담 후 안내되는 링크로 진행됩니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>카카오페이, 계좌이체 등 다양한 결제 지원</span>
                </li>
              </ul>
            </div>

            <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
              <ShoppingBag className="w-5 h-5" />
              코칭 프로그램
            </h2>
            
            {PRODUCTS.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {product.duration}
                  </span>
                </div>

                <ul className="space-y-2 mb-4">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-xl font-bold text-primary">
                    ₩{product.price.toLocaleString()}
                  </span>
                  <Button onClick={() => selectProduct(product)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    상담 신청
                  </Button>
                </div>
              </div>
            ))}

            {/* 환불 정책 링크 */}
            <div className="text-center pt-4">
              <Link to="/refund-policy" className="text-sm text-muted-foreground underline">
                환불 정책 보기
              </Link>
            </div>
          </>
        )}

        {/* 상담 신청 폼 */}
        {step === "request" && selectedProduct && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">상담 신청</h2>
            
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProduct.duration}</p>
                </div>
                <span className="text-lg font-bold text-primary">
                  ₩{selectedProduct.price.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                상담 절차 안내
              </p>
              <p className="text-sm text-muted-foreground">
                신청 후 1-2일 내로 담당자가 연락드리며, 상담 후 결제 링크가 발송됩니다.
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
              disabled={syncing}
            >
              <Send className="w-5 h-5 mr-2" />
              {syncing ? "신청 중..." : "상담 신청하기"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              신청 후 결제가 진행되지 않습니다. 상담 후 결제 안내를 받으실 수 있습니다.
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
                  <span>상담 후 결제 링크가 카카오톡으로 발송됩니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                  <span>결제 완료 후 코치가 배정됩니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">4</span>
                  <span>코칭 시작!</span>
                </li>
              </ol>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">문의가 필요하신가요?</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  support@yanggaeng.kr
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                size="lg" 
                className="w-full h-14" 
                onClick={() => navigate("/mypage/orders")}
              >
                신청 내역 확인
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                className="w-full h-14" 
                onClick={() => navigate("/dashboard")}
              >
                홈으로 돌아가기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
