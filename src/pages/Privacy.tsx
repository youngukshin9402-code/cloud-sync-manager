import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Lock, Trash2, FileText } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">개인정보 처리방침</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 수집 정보 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">수집하는 개인정보</h2>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li>• 카카오 계정 정보 (이메일, 프로필)</li>
            <li>• 휴대폰 번호 (본인 인증용)</li>
            <li>• 건강 데이터 (건강검진, 인바디, 체중)</li>
            <li>• 식사 기록 (사진, 영양 정보)</li>
            <li>• 운동 기록</li>
          </ul>
        </section>

        {/* 저장 위치 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">데이터 저장 위치</h2>
          </div>
          <div className="space-y-3 text-muted-foreground">
            <div className="p-3 bg-muted rounded-xl">
              <p className="font-medium text-foreground">로컬 저장 (기기 내)</p>
              <p className="text-sm">알림 설정, 앱 환경설정</p>
            </div>
            <div className="p-3 bg-muted rounded-xl">
              <p className="font-medium text-foreground">서버 저장 (암호화)</p>
              <p className="text-sm">건강 데이터, 식사/운동 기록, 결제 정보</p>
            </div>
          </div>
        </section>

        {/* 보안 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-health-green/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-health-green" />
            </div>
            <h2 className="text-lg font-semibold">보안 조치</h2>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li>• 전송 시 SSL/TLS 암호화</li>
            <li>• 민감 데이터 암호화 저장</li>
            <li>• 접근 권한 관리</li>
            <li>• 정기적 보안 점검</li>
          </ul>
        </section>

        {/* 데이터 삭제 */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">데이터 삭제</h2>
          </div>
          <p className="text-muted-foreground">
            회원 탈퇴 시 모든 개인정보가 삭제됩니다. 단, 전자상거래법에 따라 
            결제 관련 기록은 5년간 보관됩니다.
            마이페이지 &gt; 회원탈퇴에서 진행할 수 있습니다.
          </p>
        </section>

        {/* 관련 페이지 링크 */}
        <section className="bg-muted/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">관련 정책</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/terms">이용약관</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/health-privacy">건강정보 처리 고지</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/refund-policy">환불정책</Link>
            </Button>
          </div>
        </section>

        {/* 문의 */}
        <section className="bg-muted/50 rounded-2xl p-5 text-center">
          <p className="text-sm text-muted-foreground">
            개인정보 관련 문의: support@yanggaeng.kr
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            최종 업데이트: 2025년 1월
          </p>
        </section>
      </div>
    </div>
  );
}
