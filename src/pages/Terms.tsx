import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/consent">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">이용약관</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">영양갱 서비스 이용약관</h2>
            <p className="text-sm text-muted-foreground">최종 수정일: 2024년 12월</p>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제1조 (목적)</h3>
          <p className="text-muted-foreground leading-relaxed">
            이 약관은 영양갱(이하 "회사")이 제공하는 건강관리 서비스(이하 "서비스")의 이용조건 및 
            절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제2조 (서비스의 내용)</h3>
          <p className="text-muted-foreground leading-relaxed">
            회사가 제공하는 서비스는 다음과 같습니다:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li>건강검진 결과 분석 및 관리</li>
            <li>식단 기록 및 영양 분석</li>
            <li>운동 미션 및 기록 관리</li>
            <li>1:1 전문가 코칭 (프리미엄)</li>
            <li>보호자 연동 서비스</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제3조 (회원가입)</h3>
          <p className="text-muted-foreground leading-relaxed">
            서비스를 이용하고자 하는 자는 회사가 정한 절차에 따라 회원가입을 신청하고, 
            회사가 이를 승낙함으로써 회원가입이 완료됩니다.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제4조 (서비스 이용)</h3>
          <p className="text-muted-foreground leading-relaxed">
            서비스는 연중무휴 24시간 제공함을 원칙으로 합니다. 단, 시스템 점검 등 
            회사가 필요한 경우 서비스 이용을 일시적으로 제한할 수 있습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제5조 (베타 서비스)</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 leading-relaxed">
              현재 서비스는 베타 테스트 기간입니다. 베타 기간 동안 서비스 내용, 기능, 
              가격 등이 사전 고지 없이 변경될 수 있으며, 일부 기능이 제한될 수 있습니다.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제6조 (회원의 의무)</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li>회원은 서비스 이용 시 관계법령을 준수해야 합니다.</li>
            <li>타인의 정보를 도용하여 서비스를 이용할 수 없습니다.</li>
            <li>서비스를 통해 얻은 정보를 회사의 동의 없이 상업적으로 이용할 수 없습니다.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제7조 (면책조항)</h3>
          <p className="text-muted-foreground leading-relaxed">
            회사가 제공하는 건강 관련 정보는 참고용이며, 의료적 진단이나 치료를 대체하지 않습니다. 
            건강에 관한 결정은 반드시 전문 의료인과 상담 후 결정하시기 바랍니다.
          </p>
        </section>

        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
          <p>본 약관은 2024년 12월 1일부터 시행됩니다.</p>
        </div>
      </div>
    </div>
  );
}
