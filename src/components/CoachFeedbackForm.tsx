import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Mic, X } from "lucide-react";

interface CoachFeedbackFormProps {
  userId: string;
  userNickname: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CoachFeedbackForm({ 
  userId, 
  userNickname,
  onSuccess,
  onCancel 
}: CoachFeedbackFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 오디오 파일 검증
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "오디오 파일만 업로드 가능합니다",
          variant: "destructive"
        });
        return;
      }
      // 10MB 제한
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "파일 크기가 10MB를 초과합니다",
          variant: "destructive"
        });
        return;
      }
      setAudioFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!content.trim() && !audioFile) {
      toast({
        title: "피드백 내용 또는 음성 파일을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      let audioUrl: string | null = null;

      // 음성 파일 업로드
      if (audioFile) {
        const fileName = `${userId}/${Date.now()}_${audioFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('voice-files')
          .upload(fileName, audioFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "음성 파일 업로드 실패",
            description: uploadError.message,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        audioUrl = fileName;
      }

      // 피드백 저장
      const feedbackType = audioUrl ? 'voice' : 'text';
      const { error: insertError } = await supabase
        .from('coaching_feedback')
        .insert({
          user_id: userId,
          coach_id: user.id,
          feedback_type: feedbackType,
          content: content.trim() || null,
          audio_url: audioUrl,
          is_read: false
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        
        // DB 저장 실패 시 업로드된 파일 롤백 (원자성 보장)
        if (audioUrl) {
          console.log("Rolling back uploaded file:", audioUrl);
          const { error: deleteError } = await supabase.storage
            .from('voice-files')
            .remove([audioUrl]);
          if (deleteError) {
            console.error("Rollback failed:", deleteError);
          }
        }
        
        toast({
          title: "피드백 저장 실패",
          description: insertError.message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "피드백 전송 완료",
        description: `${userNickname}님에게 피드백을 전송했습니다.`
      });

      setContent("");
      setAudioFile(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "오류가 발생했습니다",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {userNickname}님에게 피드백 작성
        </h3>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-content">텍스트 피드백</Label>
        <Textarea
          id="feedback-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="피드백 내용을 입력하세요..."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audio-file">음성 피드백 (선택)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="audio-file"
            type="file"
            accept="audio/*"
            onChange={handleAudioChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('audio-file')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            음성 파일 업로드
          </Button>
          {audioFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="w-4 h-4" />
              <span>{audioFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAudioFile(null)}
                className="h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          MP3, WAV 등 오디오 파일 (최대 10MB)
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              전송 중...
            </>
          ) : (
            "피드백 전송"
          )}
        </Button>
      </div>
    </div>
  );
}