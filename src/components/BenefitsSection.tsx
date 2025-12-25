import { FeatureItem } from "./FeatureItem";
import {
  Eye,
  MessageCircle,
  Gift,
  Clock,
} from "lucide-react";

export function BenefitsSection() {
  const features = [
    {
      icon: Eye,
      title: "큰 글씨, 쉬운 화면",
      description: (
        <>
          눈이 편한 큰 글씨와 단순한<br className="md:hidden" />
          {" "}화면 구성으로 누구나<br className="md:hidden" />
          {" "}쉽게 사용할 수 있어요.
        </>
      ),
    },
    {
      icon: MessageCircle,
      title: "존댓말 안내",
      description:
        "모든 안내 메시지는 공손한 존댓말로 제공되어 편안하게 이용하실 수 있어요.",
    },
    {
      icon: Gift,
      title: "양갱 포인트 적립",
      description:
        "건강한 활동을 할 때마다 포인트가 쌓여요. 쿠폰이나 상품으로 교환 가능해요.",
    },
    {
      icon: Clock,
      title: "매일 조금씩",
      description: (
        <>
          하루 3가지 미션만 완료하면<br className="md:hidden" />
          {" "}OK! 부담 없이 꾸준히<br className="md:hidden" />
          {" "}건강을 관리하세요.
        </>
      ),
    },
  ];

  return (
    <section id="benefits" className="py-24">
      <div className="container mx-auto px-6">
        {/* 섹션 헤더 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            당신을 위해
            <br />
            <span className="text-primary">특별히</span> 만들었어요
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            복잡한 앱은 이제 그만!
            <br />
            누구나 쉽게 사용할 수 있도록<br className="md:hidden" />
            {" "}설계했어요.
          </p>
        </div>

        {/* 특징 그리드 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <FeatureItem
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
