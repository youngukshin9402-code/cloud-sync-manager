import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Database, Shield, Trash2 } from 'lucide-react';

export default function HealthPrivacy() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/consent">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">건강정보 처리 고지</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-health-green/10 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-health-green" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">건강정보 처리 고지</h2>
            <p className="text-sm text-muted-foreground">최종 수정일: 2024년 12월</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-foreground leading-relaxed">
            영양갱 서비스는 건강 관리를 위해 건강검진 결과, 식단, 운동 등의 
            <strong className="text-primary"> 민감정보</strong>를 처리합니다. 
            아래 내용을 확인해 주세요.
          </p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">수집하는 건강정보</h3>
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li>건강검진 결과 이미지 및 분석 데이터</li>
            <li>인바디 측정 결과 (체중, 체지방률, 골격근량 등)</li>
            <li>체중 기록</li>
            <li>식사 사진 및 영양 분석 데이터</li>
            <li>운동 기록 및 미션 수행 내역</li>
            <li>물 섭취 기록</li>
          </ul>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">정보 이용 목적</h3>
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li>맞춤형 건강 관리 서비스 제공</li>
            <li>AI 기반 건강검진 결과 분석</li>
            <li>1:1 코칭 서비스 제공 (프리미엄)</li>
            <li>건강 추이 분석 및 리포트 제공</li>
            <li>보호자 연동 시 요약 정보 공유</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">보호자 연동 시 정보 공유</h3>
          <div className="bg-muted rounded-xl p-4 space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              보호자와 연동하면 다음 정보가 공유됩니다:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-background rounded-lg">
                <span className="text-sm">건강 요약 (기본)</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">기본 허용</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background rounded-lg">
                <span className="text-sm">상세 건강 기록</span>
                <span className="text-xs bg-muted-foreground/10 text-muted-foreground px-2 py-1 rounded">선택 허용</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-lg">정보 삭제</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            회원 탈퇴 시 모든 건강정보는 즉시 삭제됩니다. 
            단, 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 삭제됩니다.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-lg">주의사항</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 leading-relaxed">
              영양갱이 제공하는 건강 분석 및 조언은 참고용이며, 
              <strong> 의료적 진단이나 치료를 대체하지 않습니다.</strong> 
              건강에 관한 중요한 결정은 반드시 전문 의료인과 상담하시기 바랍니다.
            </p>
          </div>
        </section>

        {/* 관련 정책 링크 */}
        <section className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">관련 정책</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/terms">이용약관</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/privacy">개인정보 처리방침</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/refund-policy">환불정책</Link>
            </Button>
          </div>
        </section>

        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
          <p>문의: support@yanggaeng.kr</p>
          <p className="mt-1">본 고지는 2025년 1월 1일부터 시행됩니다.</p>
        </div>
      </div>
    </div>
  );
}
