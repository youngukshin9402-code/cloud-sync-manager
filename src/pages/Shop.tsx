import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrdersServer } from "@/hooks/useServerSync";
import {
  ArrowLeft,
  ShoppingBag,
  Check,
  CreditCard,
  Loader2,
  MessageSquare,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

type ProductType = "doctor" | "trainer" | "nutritionist";
type Step = "list" | "order" | "payment" | "success" | "survey";

interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  price: number;
  duration: string;
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "의사 1:1 건강 코칭",
    type: "doctor",
    description: "전문 의사와 함께하는 맞춤 건강 관리",
    price: 150000,
    duration: "4주",
  },
  {
    id: "2",
    name: "트레이너 1:1 운동 코칭",
    type: "trainer",
    description: "전문 트레이너와 함께하는 맞춤 운동 프로그램",
    price: 100000,
    duration: "4주",
  },
  {
    id: "3",
    name: "영양사 1:1 식단 코칭",
    type: "nutritionist",
    description: "전문 영양사와 함께하는 맞춤 식단 관리",
    price: 80000,
    duration: "4주",
  },
];

const PAYMENT_METHODS = [
  { id: "kakao", name: "카카오페이", icon: "💛" },
  { id: "naver", name: "네이버페이", icon: "💚" },
  { id: "card", name: "신용카드", icon: "💳" },
];

export default function Shop() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { add: addOrder, syncing } = useOrdersServer();

  const [step, setStep] = useState<Step>("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [inquiry, setInquiry] = useState("");

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setStep("order");
  };

  const proceedToPayment = () => {
    if (!paymentMethod) {
      toast({ title: "결제수단을 선택해주세요", variant: "destructive" });
      return;
    }
    setStep("payment");
  };

  const processPayment = async () => {
    if (!selectedProduct) return;

    const result = await addOrder({
      product_name: selectedProduct.name,
      product_type: selectedProduct.type,
      price: selectedProduct.price,
      payment_method: paymentMethod,
    });

    if (result.error) {
      toast({ title: "주문 실패", variant: "destructive" });
      return;
    }

    setOrderId(result.data?.id || '');
    setStep("success");
    toast({ title: "결제 완료!", description: "코칭이 시작됩니다." });
  };

  const startCoaching = () => {
    setStep("survey");
  };

  const submitSurvey = () => {
    toast({ title: "설문 제출 완료!", description: "곧 코치가 연락드릴 예정입니다." });
    navigate("/mypage/orders");
  };

  const submitInquiry = () => {
    if (!inquiry.trim()) {
      toast({ title: "문의 내용을 입력해주세요", variant: "destructive" });
      return;
    }
    toast({ title: "문의가 접수되었습니다", description: "빠른 시일 내 답변드리겠습니다." });
    setInquiry("");
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
          <h1 className="text-2xl font-bold">1:1 코칭 상점</h1>
        </div>
        <p className="text-white/90">전문가와 함께하는 맞춤 건강 관리</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Beta Notice - Always visible */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">베타 테스트</p>
            <p className="text-sm text-amber-700">실제 결제가 이루어지지 않습니다.</p>
          </div>
        </div>

        {/* 상품 목록 */}
        {step === "list" && (
          <>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              코칭 상품
            </h2>
            {PRODUCTS.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-2xl border border-border p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {product.duration}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xl font-bold text-primary">
                    ₩{product.price.toLocaleString()}
                  </span>
                  <Button onClick={() => selectProduct(product)}>신청하기</Button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* 주문서 */}
        {step === "order" && selectedProduct && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">주문서</h2>
            
            {/* Beta Badge on Order */}
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              베타 테스트 주문 (실제 결제 없음)
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-semibold">{selectedProduct.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
              <p className="text-xl font-bold text-primary mt-2">
                ₩{selectedProduct.price.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">결제수단 선택</h3>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    paymentMethod === method.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="font-medium">{method.name}</span>
                  {paymentMethod === method.id && (
                    <Check className="w-5 h-5 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>

            <Button size="lg" className="w-full h-14" onClick={proceedToPayment}>
              결제하기 (테스트)
            </Button>
          </div>
        )}

        {/* 결제 처리 */}
        {step === "payment" && (
          <div className="text-center py-12">
            {syncing ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold">결제 처리 중...</p>
                <p className="text-sm text-muted-foreground mt-2">베타 테스트 - 실제 결제 없음</p>
              </>
            ) : (
              <>
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold mb-2">결제를 진행합니다</p>
                <p className="text-sm text-amber-600 mb-4">베타 테스트: 실제 금액이 청구되지 않습니다</p>
                <Button size="lg" onClick={processPayment}>
                  결제 확인
                </Button>
              </>
            )}
          </div>
        )}

        {/* 결제 완료 */}
        {step === "success" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">결제 완료!</h2>
              <p className="text-muted-foreground">주문번호: {orderId.slice(0, 8)}</p>
              <p className="text-sm text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-full mt-2">
                베타 테스트 - 실제 결제 없음
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-semibold mb-2">다음 단계</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. 간단한 설문 작성</li>
                <li>2. 담당 코치 배정 (1-2일 내)</li>
                <li>3. 코칭 일정 안내</li>
                <li>4. 1:1 코칭 시작</li>
              </ol>
            </div>

            <Button size="lg" className="w-full h-14" onClick={startCoaching}>
              코칭 시작하기
            </Button>
          </div>
        )}

        {/* 간단 설문 */}
        {step === "survey" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              간단 설문
            </h2>
            <p className="text-sm text-muted-foreground">
              코칭에 필요한 정보를 알려주세요
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">건강 목표</label>
                <Input placeholder="예: 체중 감량, 근력 향상" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">현재 건강 상태</label>
                <Input placeholder="예: 특이사항 없음, 고혈압 약 복용 중" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">선호하는 연락 시간</label>
                <Input placeholder="예: 평일 저녁 7시 이후" />
              </div>
            </div>

            <div className="bg-muted rounded-xl p-4 mt-6">
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" />
                문의하기
              </h3>
              <Input
                placeholder="추가 문의사항이 있으시면 입력해주세요"
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                className="mb-2"
              />
              <Button variant="outline" size="sm" onClick={submitInquiry}>
                문의 제출
              </Button>
            </div>

            <Button size="lg" className="w-full h-14" onClick={submitSurvey}>
              설문 제출하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
