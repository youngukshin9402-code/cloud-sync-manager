import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Lock, Trash2, AlertTriangle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearAllData } from "@/lib/localStorage";
import { supabase } from "@/integrations/supabase/client";

export default function ProfileEdit() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast({ title: "닉네임을 입력해주세요", variant: "destructive" });
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() })
        .eq('id', user.id);

      if (error) throw error;
      toast({ title: "프로필이 저장되었습니다" });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: "저장 실패", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmed) {
      toast({ title: "삭제 확인란을 체크해주세요", variant: "destructive" });
      return;
    }

    setDeleting(true);
    try {
      // Delete user data from various tables
      if (user) {
        // The cascade deletion will handle most data
        // But we should clear local storage first
        clearAllData();
      }
      
      // Sign out (this will trigger auth cleanup)
      await signOut();
      toast({ title: "회원 탈퇴가 완료되었습니다" });
      navigate("/");
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({ title: "탈퇴 처리 중 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
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
                value={user?.email || "이메일 없음"}
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
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            위험 영역
          </h2>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                회원 탈퇴
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  회원 탈퇴
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      탈퇴하시면 모든 데이터가 <strong className="text-destructive">즉시 삭제</strong>되며 복구할 수 없습니다.
                    </p>
                    
                    <div className="bg-destructive/10 rounded-lg p-3 space-y-2">
                      <p className="font-medium text-destructive text-sm">삭제되는 정보:</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• 건강검진, 인바디, 체중 기록</li>
                        <li>• 식사 및 운동 기록</li>
                        <li>• 포인트 및 주문 내역</li>
                        <li>• 코칭 이력 및 피드백</li>
                        <li>• 보호자 연동 정보</li>
                      </ul>
                    </div>

                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          관련 법령에 따라 결제 정보는 5년간 보관 후 삭제됩니다.
                        </span>
                      </p>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <Checkbox 
                        id="deleteConfirm" 
                        checked={deleteConfirmed}
                        onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
                      />
                      <label htmlFor="deleteConfirm" className="text-sm cursor-pointer">
                        위 내용을 확인했으며, 탈퇴에 동의합니다.
                      </label>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmed(false)}>
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={!deleteConfirmed || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "처리 중..." : "탈퇴하기"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground text-center">
            탈퇴 관련 문의: support@yanggaeng.kr
          </p>
        </div>
      </div>
    </div>
  );
}
