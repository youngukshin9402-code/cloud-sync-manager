/**
 * 관리자 체크인 리포트 페이지
 * 전체 사용자의 체크인 리포트 타임라인 조회
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckinReportTimeline } from "@/components/coach/CheckinReportTimeline";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

export default function AdminCheckinReports() {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">체크인 리포트</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <CheckinReportTimeline limit={100} />
      </main>
    </div>
  );
}
