import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type RecordStatus = "none" | "uploading" | "analyzing" | "pending_review" | "completed";

export default function Medical() {
  const { profile } = useAuth();
  const [status] = useState<RecordStatus>("none");

  const renderContent = () => {
    switch (status) {
      case "none":
        return (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center">
              <FileText className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              건강검진 결과를 올려주세요
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              검진 결과지를 사진으로 찍으면
              <br />
              AI가 쉽게 분석해드려요.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="touch-lg" variant="yanggaeng">
                <Camera className="w-5 h-5" />
                카메라로 촬영
              </Button>
              <Button size="touch" variant="outline">
                <Upload className="w-5 h-5" />
                갤러리에서 선택
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              JPG, PNG 파일 (최대 10MB)
            </p>
          </div>
        );

      case "uploading":
        return (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              업로드 중...
            </h2>
            <p className="text-lg text-muted-foreground">
              잠시만 기다려주세요.
            </p>
          </div>
        );

      case "analyzing":
        return (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-12 h-12 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              AI가 분석 중이에요
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              1~2분 정도 소요될 수 있어요.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              분석 중
            </div>
          </div>
        );

      case "pending_review":
        return (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              코치님이 검토 중이에요
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              AI 분석이 완료되었어요.
              <br />
              코치님의 검토 후 결과를 알려드릴게요.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
              검토 대기 중
            </div>
          </div>
        );

      case "completed":
        return (
          <div className="space-y-6">
            {/* 결과 카드 */}
            <div className="bg-card rounded-3xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="text-lg font-medium">검진 결과 완료</span>
              </div>

              {/* 건강 나이 */}
              <div className="text-center py-6 bg-emerald-50 rounded-2xl mb-6">
                <p className="text-muted-foreground mb-2">건강 나이</p>
                <p className="text-5xl font-bold text-emerald-600 mb-2">52세</p>
                <p className="text-lg text-foreground">
                  실제 나이 58세보다 <span className="text-emerald-600 font-semibold">6세 젊어요!</span>
                </p>
              </div>

              {/* 상태 요약 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-medium">정상</span>
                  <span className="text-muted-foreground">혈압, 간 기능, 신장</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="font-medium">주의</span>
                  <span className="text-muted-foreground">콜레스테롤</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium">관리 필요</span>
                  <span className="text-muted-foreground">혈당</span>
                </div>
              </div>

              {/* 코치 코멘트 */}
              <div className="mt-6 p-4 rounded-xl bg-muted">
                <p className="text-sm text-muted-foreground mb-1">💬 코치 코멘트</p>
                <p className="text-foreground">
                  "혈당 수치가 조금 높아요. 식후 산책을 추천드려요!"
                </p>
              </div>
            </div>

            <Button variant="outline" size="touch" className="w-full">
              카카오톡으로 공유하기
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">의료양갱</h1>
        <p className="text-lg text-muted-foreground">
          건강검진 결과를 쉽게 이해해보세요
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="bg-card rounded-3xl border border-border p-6">
        {renderContent()}
      </div>
    </div>
  );
}
