import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  History,
  Share2,
  MessageCircle,
} from "lucide-react";
import { useHealthRecords, HealthRecord, HealthRecordItem } from "@/hooks/useHealthRecords";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function StatusBadge({ status }: { status: "normal" | "warning" | "danger" }) {
  const styles = {
    normal: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  };
  const labels = {
    normal: "정상",
    warning: "주의",
    danger: "관리 필요",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function HealthItemCard({ item }: { item: HealthRecordItem }) {
  const dotColors = {
    normal: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  const bgColors = {
    normal: "bg-emerald-50",
    warning: "bg-amber-50",
    danger: "bg-red-50",
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${bgColors[item.status]}`}>
      <div className={`w-3 h-3 rounded-full ${dotColors[item.status]}`} />
      <div className="flex-1">
        <span className="font-medium">{item.name}</span>
        <span className="text-muted-foreground ml-2">
          {item.value} {item.unit}
        </span>
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}

function RecordCard({ 
  record, 
  onClick, 
  isActive 
}: { 
  record: HealthRecord; 
  onClick: () => void;
  isActive: boolean;
}) {
  const statusLabels = {
    uploading: "업로드 중",
    analyzing: "분석 중",
    pending_review: "검토 대기",
    completed: "완료",
  };
  const statusColors = {
    uploading: "text-blue-600",
    analyzing: "text-primary",
    pending_review: "text-amber-600",
    completed: "text-emerald-600",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-colors ${
        isActive 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {format(new Date(record.created_at), "yyyy년 M월 d일", { locale: ko })}
          </p>
          <p className={`text-sm ${statusColors[record.status]}`}>
            {statusLabels[record.status]}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </button>
  );
}

export default function Medical() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const {
    records,
    currentRecord,
    isLoading,
    isUploading,
    uploadHealthCheckup,
    setCurrentRecord,
  } = useHealthRecords();

  const handleShareToKakao = () => {
    if (!currentRecord?.parsed_data) return;

    const healthAge = currentRecord.health_age;
    const summary = currentRecord.parsed_data.summary || "건강검진 결과가 도착했어요!";

    // Check if Kakao SDK is available
    if (typeof window !== "undefined" && (window as any).Kakao) {
      const Kakao = (window as any).Kakao;
      
      if (!Kakao.isInitialized()) {
        // In production, you would initialize with your app key
        toast.error("카카오 SDK가 초기화되지 않았어요. 관리자에게 문의해주세요.");
        return;
      }

      Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "건강양갱 - 건강검진 결과",
          description: healthAge 
            ? `건강나이: ${healthAge}세\n${summary.slice(0, 50)}...` 
            : summary.slice(0, 100),
          imageUrl: "https://your-domain.com/og-image.png", // Replace with actual image
          link: {
            mobileWebUrl: window.location.origin,
            webUrl: window.location.origin,
          },
        },
        buttons: [
          {
            title: "자세히 보기",
            link: {
              mobileWebUrl: window.location.origin,
              webUrl: window.location.origin,
            },
          },
        ],
      });
    } else {
      // Fallback: Copy to clipboard
      const shareText = healthAge
        ? `[건강양갱] 건강검진 결과\n건강나이: ${healthAge}세\n${summary}`
        : `[건강양갱] 건강검진 결과\n${summary}`;

      navigator.clipboard.writeText(shareText);
      toast.success("공유 내용이 복사되었어요! 카카오톡에 붙여넣기 해주세요.");
    }
    setShowShareDialog(false);
  };

  const handleShareCopy = () => {
    if (!currentRecord?.parsed_data) return;

    const healthAge = currentRecord.health_age;
    const summary = currentRecord.parsed_data.summary || "";

    const shareText = healthAge
      ? `[건강양갱] 건강검진 결과\n건강나이: ${healthAge}세\n${summary}`
      : `[건강양갱] 건강검진 결과\n${summary}`;

    navigator.clipboard.writeText(shareText);
    toast.success("공유 내용이 복사되었어요!");
    setShowShareDialog(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate file types and sizes
    const validFiles = fileArray.filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    await uploadHealthCheckup(validFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      );
    }

    if (!currentRecord) {
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              카메라로 촬영
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 text-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-5 h-5" />
              갤러리에서 선택
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            JPG, PNG 파일 (최대 10MB)
          </p>
        </div>
      );
    }

    switch (currentRecord.status) {
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

            {/* Show preliminary results */}
            {currentRecord.parsed_data && (
              <div className="mt-8 text-left bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold mb-4">AI 분석 결과 (코치 검토 전)</h3>
                <p className="text-muted-foreground mb-4">
                  {currentRecord.parsed_data.summary}
                </p>
                <div className="space-y-2">
                  {currentRecord.parsed_data.items.slice(0, 3).map((item, idx) => (
                    <HealthItemCard key={idx} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "completed":
        const parsedData = currentRecord.parsed_data;
        const healthAge = currentRecord.health_age;
        
        // Group items by status
        const normalItems = parsedData?.items.filter(i => i.status === "normal") || [];
        const warningItems = parsedData?.items.filter(i => i.status === "warning") || [];
        const dangerItems = parsedData?.items.filter(i => i.status === "danger") || [];

        return (
          <div className="space-y-6">
            {/* 결과 카드 */}
            <div className="bg-card rounded-3xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="text-lg font-medium">검진 결과 완료</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {format(new Date(currentRecord.created_at), "yyyy.MM.dd", { locale: ko })}
                </span>
              </div>

              {/* 건강 나이 */}
              {healthAge && (
                <div className="text-center py-6 bg-emerald-50 rounded-2xl mb-6">
                  <p className="text-muted-foreground mb-2">건강 나이</p>
                  <p className="text-5xl font-bold text-emerald-600 mb-2">{healthAge}세</p>
                </div>
              )}

              {/* 요약 */}
              {parsedData?.summary && (
                <p className="text-lg text-foreground mb-6">{parsedData.summary}</p>
              )}

              {/* 상태별 그룹 */}
              <div className="space-y-4">
                {normalItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-emerald-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      정상 ({normalItems.length}개)
                    </h4>
                    <div className="space-y-2">
                      {normalItems.map((item, idx) => (
                        <HealthItemCard key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {warningItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      주의 ({warningItems.length}개)
                    </h4>
                    <div className="space-y-2">
                      {warningItems.map((item, idx) => (
                        <HealthItemCard key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {dangerItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      관리 필요 ({dangerItems.length}개)
                    </h4>
                    <div className="space-y-2">
                      {dangerItems.map((item, idx) => (
                        <HealthItemCard key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 권장 사항 */}
              {parsedData?.recommendations && parsedData.recommendations.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-blue-50">
                  <h4 className="font-medium text-blue-700 mb-2">💡 권장 사항</h4>
                  <ul className="space-y-1 text-blue-800">
                    {parsedData.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 코치 코멘트 */}
              {currentRecord.coach_comment && (
                <div className="mt-6 p-4 rounded-xl bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">💬 코치 코멘트</p>
                  <p className="text-foreground">{currentRecord.coach_comment}</p>
                </div>
              )}
            </div>

            {/* 가족에게 공유 */}
            <Button 
              size="lg" 
              className="w-full h-14"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="w-5 h-5 mr-2" />
              가족에게 공유하기
            </Button>

            {/* 새 검진 업로드 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full h-14"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-5 h-5 mr-2" />
              새 검진 결과 업로드
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

      {/* 과거 기록 */}
      {records.length > 1 && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            이전 검진 기록
          </h3>
          <div className="space-y-2">
            {records.slice(0, 5).map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => setCurrentRecord(record)}
                isActive={currentRecord?.id === record.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* 공유 다이얼로그 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>가족에게 공유하기</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 justify-start bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] border-none"
              onClick={handleShareToKakao}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              카카오톡으로 공유
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 justify-start"
              onClick={handleShareCopy}
            >
              <Share2 className="w-5 h-5 mr-3" />
              텍스트 복사하기
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            건강나이와 상태 요약만 공유됩니다.
            <br />
            세부 수치는 공유되지 않아요.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
