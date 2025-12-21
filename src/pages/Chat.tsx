import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export default function Chat() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string>('');
  const [loadingCoach, setLoadingCoach] = useState(true);
  
  // 코치 정보 로드 (채팅 연결은 assigned_coach_id로 바로 처리)
  useEffect(() => {
    const assignedCoachId = profile?.assigned_coach_id ?? null;

    if (!assignedCoachId) {
      setCoachId(null);
      setCoachName('');
      setLoadingCoach(false);
      return;
    }

    // 채팅 파트너 ID는 프로필에 이미 있으므로 바로 세팅 (RLS로 코치 프로필 조회가 막혀도 채팅은 가능)
    setCoachId(assignedCoachId);
    setLoadingCoach(true);

    const loadCoachName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', assignedCoachId)
          .maybeSingle();

        if (!error && data?.nickname) {
          setCoachName(data.nickname);
        } else {
          setCoachName('코치');
        }
      } catch (error) {
        console.error('Error loading coach name:', error);
        setCoachName('코치');
      } finally {
        setLoadingCoach(false);
      }
    };

    loadCoachName();
  }, [profile?.assigned_coach_id]);

  // 코치 ID가 설정된 후에만 채팅 훅 사용
  const { messages, loading, sending, sendMessage } = useChat(coachId || undefined);

  // No assigned coach
  if (!loadingCoach && !profile?.assigned_coach_id) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">코치 채팅</h1>
        </header>

        <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">배정된 코치가 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            관리자가 코치를 배정하면<br />
            1:1 채팅 상담을 받으실 수 있습니다.
          </p>
          <Button onClick={() => navigate('/profile')}>
            마이페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (loadingCoach) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-24" />
        </header>
        <div className="p-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{coachName} 코치</h1>
          <p className="text-xs text-muted-foreground">1:1 채팅</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <ChatWindow
          messages={messages}
          loading={loading}
          sending={sending}
          onSendMessage={sendMessage}
          partnerName={coachName}
        />
      </div>
    </div>
  );
}
