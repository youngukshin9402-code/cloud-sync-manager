import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Link2, Shield, Eye, EyeOff } from "lucide-react";
import { getGuardianSettings, setGuardianSettings, GuardianSettings } from "@/lib/localStorage";
import { useAuth } from "@/contexts/AuthContext";

export default function GuardianSettingsPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<GuardianSettings>(getGuardianSettings());
  const [connectionCode, setConnectionCode] = useState("");

  const isGuardian = profile?.user_type === "guardian";

  const handleConnect = () => {
    if (!connectionCode || connectionCode.length !== 6) {
      toast({ title: "6자리 연결 코드를 입력해주세요", variant: "destructive" });
      return;
    }

    // Mock connection
    const updated = {
      ...settings,
      connectedUserId: `user_${connectionCode}`,
      connectedUserNickname: `사용자_${connectionCode.slice(0, 3)}`,
    };
    setSettings(updated);
    setGuardianSettings(updated);
    toast({ title: "가족이 연결되었습니다!" });
    setConnectionCode("");
  };

  const handleDisconnect = () => {
    const updated = {
      ...settings,
      connectedUserId: undefined,
      connectedUserNickname: undefined,
    };
    setSettings(updated);
    setGuardianSettings(updated);
    toast({ title: "연결이 해제되었습니다" });
  };

  const handlePermissionChange = (key: 'viewSummary' | 'viewDetails') => {
    const updated = {
      ...settings,
      permissions: {
        ...settings.permissions,
        [key]: !settings.permissions[key],
      },
    };
    setSettings(updated);
    setGuardianSettings(updated);
    toast({ title: "권한 설정이 저장되었습니다" });
  };

  // Generate connection code for non-guardians
  const generateCode = () => {
    const code = Math.random().toString().slice(2, 8);
    navigator.clipboard.writeText(code);
    toast({ 
      title: "연결 코드가 생성되었습니다", 
      description: `코드: ${code} (클립보드에 복사됨)` 
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">보호자 연결</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isGuardian ? (
          // Guardian View
          <>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">연결된 가족</h2>
                  <p className="text-sm text-muted-foreground">
                    가족의 건강 정보를 확인할 수 있습니다
                  </p>
                </div>
              </div>

              {settings.connectedUserId ? (
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{settings.connectedUserNickname}</p>
                    <p className="text-sm text-muted-foreground">연결됨</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    연결 해제
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    가족에게 받은 6자리 연결 코드를 입력하세요
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="연결 코드 6자리"
                      value={connectionCode}
                      onChange={e => setConnectionCode(e.target.value)}
                      maxLength={6}
                    />
                    <Button onClick={handleConnect}>연결</Button>
                  </div>
                </div>
              )}
            </div>

            {settings.connectedUserId && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  열람 권한
                </h3>
                <p className="text-sm text-muted-foreground">
                  가족이 허용한 범위 내에서만 정보를 볼 수 있습니다
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-muted-foreground" />
                      <span>요약 정보</span>
                    </div>
                    <span className={settings.permissions.viewSummary ? 'text-health-green' : 'text-muted-foreground'}>
                      {settings.permissions.viewSummary ? '허용됨' : '비허용'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                      <span>상세 정보</span>
                    </div>
                    <span className={settings.permissions.viewDetails ? 'text-health-green' : 'text-muted-foreground'}>
                      {settings.permissions.viewDetails ? '허용됨' : '비허용'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // User View - Generate code for guardian
          <>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">보호자 연결</h2>
                  <p className="text-sm text-muted-foreground">
                    가족에게 코드를 전달하여 연결하세요
                  </p>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={generateCode}>
                연결 코드 생성
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                코드는 24시간 동안 유효합니다
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                권한 설정
              </h3>
              <p className="text-sm text-muted-foreground">
                보호자가 볼 수 있는 정보를 설정하세요
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium">요약 정보 (기본)</p>
                    <p className="text-sm text-muted-foreground">물/식사/운동 달성률</p>
                  </div>
                  <Switch
                    checked={settings.permissions.viewSummary}
                    onCheckedChange={() => handlePermissionChange('viewSummary')}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium">상세 정보</p>
                    <p className="text-sm text-muted-foreground">건강검진, 식사 사진 등</p>
                  </div>
                  <Switch
                    checked={settings.permissions.viewDetails}
                    onCheckedChange={() => handlePermissionChange('viewDetails')}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
