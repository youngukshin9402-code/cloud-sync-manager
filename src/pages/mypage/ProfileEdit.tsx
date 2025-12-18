import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Lock, CreditCard, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearAllData } from "@/lib/localStorage";

export default function ProfileEdit() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast({ title: "닉네임을 입력해주세요", variant: "destructive" });
      return;
    }

    setSaving(true);
    // Mock save - in real app, would call supabase
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "프로필이 저장되었습니다" });
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    // Clear all local data
    clearAllData();
    // Sign out
    await signOut();
    toast({ title: "회원 탈퇴가 완료되었습니다" });
    navigate("/");
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
          <h1 className="text-xl font-bold">내 정보 수정</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Info */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                닉네임
              </label>
              <Input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="닉네임"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                이메일
              </label>
              <Input
                value={profile?.id?.slice(0, 8) + "@example.com"}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">카카오 계정과 연동되어 있습니다</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                비밀번호
              </label>
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                카카오 로그인을 사용 중입니다. 비밀번호는 카카오에서 변경해주세요.
              </p>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "변경사항 저장"}
            </Button>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            결제 정보
          </h2>
          <p className="text-muted-foreground">
            등록된 결제 수단이 없습니다
          </p>
          <Button variant="outline" className="w-full">
            결제 수단 추가
          </Button>
        </div>

        {/* Management Mode */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">관리 방식</h3>
              <p className="text-sm text-muted-foreground">직접관리 (고정)</p>
            </div>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              활성
            </span>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-destructive">위험 영역</h2>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                회원 탈퇴
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  탈퇴하시면 모든 데이터가 삭제되며 복구할 수 없습니다.
                  <br />
                  <br />
                  삭제되는 정보:
                  <ul className="list-disc list-inside mt-2">
                    <li>건강검진, 인바디, 체중 기록</li>
                    <li>식사 및 운동 기록</li>
                    <li>포인트 및 주문 내역</li>
                    <li>코칭 이력</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  탈퇴하기
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
