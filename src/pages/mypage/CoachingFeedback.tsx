import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageCircle, Play, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CoachingFeedback {
  id: string;
  coach_id: string;
  feedback_type: 'text' | 'voice';
  content: string | null;
  audio_url: string | null;
  is_read: boolean;
  created_at: string;
  coach_nickname?: string;
}

export default function CoachingFeedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<CoachingFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFeedbacks = async () => {
      try {
        const { data, error } = await supabase
          .from('coaching_feedback')
          .select(`
            *,
            coach:coach_id(nickname)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((f: any) => ({
          ...f,
          coach_nickname: f.coach?.nickname || '코치'
        }));
        setFeedbacks(mapped);

        // Mark all as read
        const unreadIds = (data || []).filter((f: any) => !f.is_read).map((f: any) => f.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('coaching_feedback')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [user]);

  const playAudio = async (feedbackId: string, audioUrl: string) => {
    if (playingAudio === feedbackId) {
      setPlayingAudio(null);
      return;
    }

    try {
      const { data } = await supabase.storage
        .from('voice-files')
        .createSignedUrl(audioUrl, 3600);

      if (data?.signedUrl) {
        const audio = new Audio(data.signedUrl);
        audio.onended = () => setPlayingAudio(null);
        audio.play();
        setPlayingAudio(feedbackId);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">코칭 피드백</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {feedbacks.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">아직 받은 피드백이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              코칭을 신청하시면 코치의 피드백을 받을 수 있습니다
            </p>
          </div>
        ) : (
          feedbacks.map((feedback) => (
            <div 
              key={feedback.id} 
              className={`bg-card rounded-2xl border p-5 space-y-3 ${
                !feedback.is_read ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {feedback.coach_nickname?.[0] || 'C'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{feedback.coach_nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(feedback.created_at).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant={feedback.feedback_type === 'voice' ? 'secondary' : 'outline'}>
                  {feedback.feedback_type === 'voice' ? (
                    <><Volume2 className="w-3 h-3 mr-1" /> 음성</>
                  ) : (
                    '텍스트'
                  )}
                </Badge>
              </div>

              {feedback.feedback_type === 'text' && feedback.content && (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {feedback.content}
                </p>
              )}

              {feedback.feedback_type === 'voice' && feedback.audio_url && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => playAudio(feedback.id, feedback.audio_url!)}
                >
                  {playingAudio === feedback.id ? (
                    <>재생 중...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> 음성 메시지 재생</>
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
