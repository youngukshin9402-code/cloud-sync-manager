import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Mail, Clock, Shield } from 'lucide-react';

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
            <p className="text-sm text-muted-foreground">최종 수정일: 2025년 1월</p>
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
          <h3 className="font-semibold text-lg">제5조 (유료 서비스)</h3>
          <p className="text-muted-foreground leading-relaxed">
            1:1 코칭 등 유료 서비스의 이용료 및 결제 방법은 해당 서비스 신청 시 
            별도로 안내됩니다. 유료 서비스의 취소 및 환불은 환불 정책에 따릅니다.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제6조 (회원의 의무)</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li>회원은 서비스 이용 시 관계법령을 준수해야 합니다.</li>
            <li>타인의 정보를 도용하여 서비스를 이용할 수 없습니다.</li>
            <li>서비스를 통해 얻은 정보를 회사의 동의 없이 상업적으로 이용할 수 없습니다.</li>
            <li>회원은 정확한 건강 정보를 제공해야 하며, 허위 정보로 인한 불이익은 회원에게 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제7조 (면책조항)</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-amber-800 leading-relaxed">
                <p className="font-medium mb-2">중요 고지사항</p>
                <p>
                  회사가 제공하는 건강 관련 정보는 참고용이며, <strong>의료적 진단이나 치료를 대체하지 않습니다</strong>. 
                  건강에 관한 결정은 반드시 전문 의료인과 상담 후 결정하시기 바랍니다.
                </p>
                <p className="mt-2">
                  본 서비스는 의료기관이 아니며, 제공되는 코칭은 의료행위에 해당하지 않습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제8조 (회원 탈퇴 및 데이터 삭제)</h3>
          <p className="text-muted-foreground leading-relaxed">
            회원은 언제든지 서비스 내에서 회원 탈퇴를 신청할 수 있으며, 
            회사는 즉시 회원 탈퇴를 처리합니다. 탈퇴 시 회원의 개인정보 및 
            건강 데이터는 관련 법령에 따라 즉시 또는 일정 기간 후 삭제됩니다.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">제9조 (분쟁 해결)</h3>
          <p className="text-muted-foreground leading-relaxed">
            서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 회원은 분쟁의 해결을 위해 
            성실히 협의합니다. 협의가 되지 않을 경우, 관할 법원은 회사 소재지 법원으로 합니다.
          </p>
        </section>

        {/* 고객센터 정보 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-lg">고객센터 안내</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">이메일 문의</p>
                <p className="text-sm text-muted-foreground">support@yanggaeng.kr</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">처리 기간</p>
                <p className="text-sm text-muted-foreground">영업일 기준 1-3일 이내</p>
              </div>
            </div>
          </div>
        </section>

        {/* 관련 정책 링크 */}
        <section className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">관련 정책</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/privacy">개인정보 처리방침</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/health-privacy">건강정보 처리 고지</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/refund-policy">환불정책</Link>
            </Button>
          </div>
        </section>

        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
          <p>본 약관은 2025년 1월 1일부터 시행됩니다.</p>
        </div>
      </div>
    </div>
  );
}
