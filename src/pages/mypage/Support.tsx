import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, HelpCircle, MessageSquare, Send, Mail, Phone } from "lucide-react";

const faqs = [
  {
    q: "포인트는 어떻게 적립하나요?",
    a: "매일 3개의 미션을 모두 완료하면 100포인트가 적립됩니다. 식사 기록, 운동 기록 등 다양한 활동으로도 포인트를 얻을 수 있습니다."
  },
  {
    q: "프리미엄 서비스는 무엇인가요?",
    a: "프리미엄 서비스에 가입하시면 전문 의사, 트레이너, 영양사와의 1:1 코칭을 받으실 수 있습니다."
  },
  {
    q: "보호자 연결은 어떻게 하나요?",
    a: "마이페이지 > 보호자 연결에서 연결 코드를 생성하고, 가족에게 코드를 전달하면 됩니다."
  },
  {
    q: "식사 사진 분석은 정확한가요?",
    a: "AI 기반 분석으로 대략적인 칼로리와 영양 정보를 제공합니다. 정확한 수치가 필요하면 수동으로 수정하실 수 있습니다."
  },
  {
    q: "건강검진 분석 결과는 의료적 진단인가요?",
    a: "아니요, 건강검진 분석은 참고용 정보입니다. 정확한 진단은 반드시 의료 전문가와 상담하세요."
  },
  {
    q: "데이터는 어디에 저장되나요?",
    a: "개인 건강 데이터는 암호화되어 안전하게 저장됩니다. 자세한 내용은 개인정보 처리방침을 확인해주세요."
  },
];

export default function SupportPage() {
  const { toast } = useToast();
  const [inquiryForm, setInquiryForm] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!inquiryForm.email || !inquiryForm.subject || !inquiryForm.message) {
      toast({ title: "모든 필드를 입력해주세요", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    // Mock submit
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "문의가 접수되었습니다", description: "빠른 시일 내에 답변 드리겠습니다." });
    setInquiryForm({ email: "", subject: "", message: "" });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">고객센터</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Info */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            연락처
          </h2>
          <div className="space-y-2 text-muted-foreground">
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              support@yanggaeng.kr
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              1588-0000 (평일 09:00-18:00)
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            자주 묻는 질문
          </h2>
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="text-left">{faq.q}</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Inquiry Form */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            문의하기
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <Input
                type="email"
                placeholder="답변 받을 이메일"
                value={inquiryForm.email}
                onChange={e => setInquiryForm({ ...inquiryForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">제목</label>
              <Input
                placeholder="문의 제목"
                value={inquiryForm.subject}
                onChange={e => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                placeholder="문의 내용을 자세히 작성해주세요"
                rows={4}
                value={inquiryForm.message}
                onChange={e => setInquiryForm({ ...inquiryForm, message: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "전송 중..." : "문의 보내기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
