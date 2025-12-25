import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Lock, Trash2, AlertTriangle, Shield, Ruler, Calendar, Weight, Target, HeartPulse, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { clearAllData } from "@/lib/localStorage";
import { supabase } from "@/integrations/supabase/client";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";

export default function ProfileEdit() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { settings, loading: settingsLoading, save: saveNutritionSettings, saving: nutritionSaving } = useNutritionSettings();
  
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // 신체 정보 상태
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState("");

  // 설정 로드
  useEffect(() => {
    if (settings) {
      setHeightCm(settings.heightCm?.toString() || "");
      setAge(settings.age?.toString() || "");
      setCurrentWeight(settings.currentWeight?.toString() || "");
      setGoalWeight(settings.goalWeight?.toString() || "");
      setConditions(settings.conditions || []);
    }
  }, [settings]);

  const handleAddCondition = () => {
    const trimmed = conditionInput.trim();
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions([...conditions, trimmed]);
      setConditionInput("");
    }
  };

  const handleRemoveCondition = (condition: string) => {
    setConditions(conditions.filter(c => c !== condition));
  };

  const handleConditionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCondition();
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast({ title: "닉네임을 입력해주세요", variant: "destructive" });
      return;
    }

    // 신체 정보 검증
    const ageNum = parseInt(age);
    const heightNum = parseInt(heightCm);
    const currentWeightNum = parseFloat(currentWeight);
    const goalWeightNum = parseFloat(goalWeight);

    if (!age || !heightCm || !currentWeight || !goalWeight) {
      toast({ title: "필수 정보를 모두 입력해주세요", variant: "destructive" });
      return;
    }

    if (ageNum < 1 || ageNum > 120) {
      toast({ title: "올바른 나이를 입력해주세요", variant: "destructive" });
      return;
    }

    if (heightNum < 100 || heightNum > 250) {
      toast({ title: "올바른 키를 입력해주세요 (100-250cm)", variant: "destructive" });
      return;
    }

    if (currentWeightNum < 30 || currentWeightNum > 300) {
      toast({ title: "올바른 현재 체중을 입력해주세요 (30-300kg)", variant: "destructive" });
      return;
    }

    if (goalWeightNum < 30 || goalWeightNum > 300) {
      toast({ title: "올바른 목표 체중을 입력해주세요 (30-300kg)", variant: "destructive" });
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      // 프로필 닉네임 저장
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() })
        .eq('id', user.id);

      if (error) throw error;

      // 신체 정보 저장 (AI 추천 칼로리 자동 재계산)
      const success = await saveNutritionSettings({
        age: ageNum,
        heightCm: heightNum,
        currentWeight: currentWeightNum,
        goalWeight: goalWeightNum,
        conditions,
      });

      if (success) {
        toast({ title: "내 정보가 저장되었습니다", description: "AI 맞춤 칼로리가 재계산되었습니다" });
      } else {
        throw new Error("신체 정보 저장 실패");
      }
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
      if (user) {
        clearAllData();
      }
      
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

  const isSaving = saving || nutritionSaving;

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
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            기본 정보
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">닉네임</label>
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
          </div>
        </div>

        {/* 신체 정보 */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <HeartPulse className="w-5 h-5" />
            신체 정보
          </h3>
          <p className="text-sm text-muted-foreground -mt-2">
            정확한 입력으로 AI가 맞춤 칼로리를 계산합니다
          </p>
          
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  만 나이 <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="30"
                    min={1}
                    max={120}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">세</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Ruler className="w-4 h-4" />
                  키 <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                    placeholder="170"
                    min={100}
                    max={250}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">cm</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Weight className="w-4 h-4" />
                  현재 체중 <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={currentWeight}
                    onChange={e => setCurrentWeight(e.target.value)}
                    placeholder="70"
                    min={30}
                    max={300}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  목표 체중 <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={e => setGoalWeight(e.target.value)}
                    placeholder="65"
                    min={30}
                    max={300}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
                </div>
              </div>
            </div>
          )}

          {/* 지병 입력 */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">지병 (선택)</label>
            <div className="flex gap-2">
              <Input
                value={conditionInput}
                onChange={e => setConditionInput(e.target.value)}
                onKeyDown={handleConditionKeyDown}
                placeholder="예: 고혈압, 당뇨"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddCondition}>
                추가
              </Button>
            </div>
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {conditions.map(condition => (
                  <Badge key={condition} variant="secondary" className="gap-1">
                    {condition}
                    <button onClick={() => handleRemoveCondition(condition)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 저장 버튼 */}
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            "변경사항 저장"
          )}
        </Button>

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

        {/* 회원 탈퇴 */}
        <div className="space-y-3">
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
