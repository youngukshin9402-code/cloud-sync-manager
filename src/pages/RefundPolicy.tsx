import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Clock, AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">환불 정책</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">1:1 코칭 환불 및 취소 정책</h2>
            <p className="text-sm text-muted-foreground">최종 수정일: 2025년 1월</p>
          </div>
        </div>

        {/* 환불 가능 기간 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg">전액 환불</h3>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>결제 후 <strong className="text-foreground">7일 이내</strong>, 코칭 시작 전 취소 시</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>코치 배정 전 취소 시</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">•</span>
              <span>회사의 사정으로 서비스 제공이 불가한 경우</span>
            </li>
          </ul>
        </section>

        {/* 부분 환불 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-lg">부분 환불</h3>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>코칭 시작 후 <strong className="text-foreground">1주차</strong>: 결제 금액의 70% 환불</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>코칭 시작 후 <strong className="text-foreground">2주차</strong>: 결제 금액의 50% 환불</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>코칭 시작 후 <strong className="text-foreground">3주차</strong>: 결제 금액의 30% 환불</span>
            </li>
          </ul>
        </section>

        {/* 환불 불가 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg">환불 불가</h3>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-1">•</span>
              <span>코칭 시작 후 <strong className="text-foreground">4주차 이후</strong> 또는 코칭 완료 후</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-1">•</span>
              <span>회원의 귀책사유로 인한 코칭 불이행 (무단 불참 등)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-1">•</span>
              <span>이미 제공된 서비스 (완료된 코칭 세션)</span>
            </li>
          </ul>
        </section>

        {/* 환불 절차 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-lg">환불 신청 방법</h3>
          <ol className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
              <span>마이페이지 → 주문내역에서 <strong className="text-foreground">취소 요청</strong> 버튼 클릭</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
              <span>또는 고객센터 이메일로 환불 요청 (주문번호 필수)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
              <span>환불 심사 후 <strong className="text-foreground">영업일 기준 3-5일</strong> 이내 처리</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
              <span>결제 수단에 따라 <strong className="text-foreground">3-7일</strong> 이내 환불 완료</span>
            </li>
          </ol>
        </section>

        {/* 코칭 일정 변경 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-lg">코칭 일정 변경</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>예정된 코칭 <strong className="text-foreground">24시간 전</strong>까지 무료 변경 가능</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>24시간 이내 변경/취소 시 1회 차감 처리될 수 있음</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>일정 변경은 코칭 기간 내에서만 가능</span>
            </li>
          </ul>
        </section>

        {/* 고객센터 */}
        <section className="bg-muted/50 rounded-2xl p-5 text-center space-y-3">
          <h3 className="font-semibold">환불 관련 문의</h3>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Mail className="w-5 h-5" />
            <span className="font-medium">support@yanggaeng.kr</span>
          </div>
          <p className="text-sm text-muted-foreground">
            평일 09:00 - 18:00 (주말/공휴일 제외)
          </p>
          <p className="text-xs text-muted-foreground">
            환불 처리 기간: 영업일 기준 3-5일
          </p>
        </section>

        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
          <p>본 환불 정책은 2025년 1월 1일부터 시행됩니다.</p>
        </div>
      </div>
    </div>
  );
}
