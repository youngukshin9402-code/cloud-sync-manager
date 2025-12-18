import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Link2,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Clock,
  Heart,
} from "lucide-react";
import { useGuardianConnection } from "@/hooks/useGuardianConnection";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function Guardian() {
  const { profile } = useAuth();
  const {
    connections,
    pendingCode,
    codeExpiresAt,
    isLoading,
    generateConnectionCode,
    connectWithCode,
  } = useGuardianConnection();

  const [inputCode, setInputCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isGuardian = profile?.user_type === "guardian";

  const handleCopyCode = async () => {
    if (pendingCode) {
      await navigator.clipboard.writeText(pendingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    if (!inputCode.trim() || inputCode.length !== 6) return;

    setIsConnecting(true);
    await connectWithCode(inputCode);
    setInputCode("");
    setIsConnecting(false);
  };

  // Get active connections (excluding pending ones)
  const activeConnections = connections.filter(
    (c) => c.guardian_id && c.user_id !== c.guardian_id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">가족 연결</h1>
        <p className="text-lg text-muted-foreground">
          {isGuardian
            ? "부모님과 연결하여 건강을 함께 관리하세요"
            : "보호자와 연결하여 건강을 공유하세요"}
        </p>
      </div>

      {/* 연결 상태 */}
      {activeConnections.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6" />
            <span className="text-xl font-semibold">연결된 가족</span>
          </div>
          <div className="space-y-3">
            {activeConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between bg-white/10 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {isGuardian ? conn.user_nickname : conn.guardian_nickname || "가족"}
                    </p>
                    <p className="text-sm text-white/70">
                      {isGuardian ? "부모님" : "보호자"}
                    </p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-white/80" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용자용: 연결 코드 생성 */}
      {!isGuardian && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">연결 코드 만들기</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            연결 코드를 만들어 보호자(자녀)에게 전달해주세요.
            <br />
            보호자가 코드를 입력하면 연결이 완료됩니다.
          </p>

          {pendingCode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 p-6 bg-muted rounded-2xl">
                <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                  {pendingCode}
                </span>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    코드 복사
                  </>
                )}
              </Button>
              {codeExpiresAt && (
                <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(codeExpiresAt, "M월 d일 HH:mm", { locale: ko })}까지 유효
                </p>
              )}
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full h-14"
              onClick={generateConnectionCode}
            >
              <Link2 className="w-5 h-5" />
              연결 코드 생성하기
            </Button>
          )}
        </div>
      )}

      {/* 보호자용: 코드 입력 */}
      {isGuardian && (
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">부모님과 연결하기</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            부모님이 만든 연결 코드를 입력해주세요.
          </p>

          <div className="space-y-4">
            <Input
              placeholder="6자리 코드 입력"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-16 text-2xl text-center font-mono tracking-widest"
              maxLength={6}
            />
            <Button
              size="lg"
              className="w-full h-14"
              onClick={handleConnect}
              disabled={inputCode.length !== 6 || isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  연결하기
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 연결 혜택 안내 */}
      <div className="bg-muted rounded-3xl p-6">
        <h3 className="font-semibold mb-4">연결하면 좋은 점</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">
              {isGuardian
                ? "부모님의 건강검진 결과를 함께 확인할 수 있어요"
                : "보호자가 건강 상태를 함께 확인할 수 있어요"}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">
              {isGuardian
                ? "부모님의 미션 수행 현황을 확인할 수 있어요"
                : "보호자에게 건강 리포트를 공유할 수 있어요"}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">
              {isGuardian
                ? "프리미엄 서비스를 대신 결제할 수 있어요"
                : "프리미엄 서비스를 보호자가 결제할 수 있어요"}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
