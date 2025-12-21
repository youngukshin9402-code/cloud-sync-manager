import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Chat() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string>('');
  const [loadingCoach, setLoadingCoach] = useState(true);
  
  const { getAssignedCoach } = useChat();
  const { messages, loading, sending, sendMessage } = useChat(coachId || undefined);

  useEffect(() => {
    const loadCoach = async () => {
      setLoadingCoach(true);
      const coach = await getAssignedCoach();
      if (coach) {
        setCoachId(coach.id);
        setCoachName(coach.nickname || '코치');
      }
      setLoadingCoach(false);
    };

    loadCoach();
  }, [getAssignedCoach]);

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
            코칭 서비스를 구독하면 전문 코치가 배정되어<br />
            1:1 채팅 상담을 받으실 수 있습니다.
          </p>
          <Button onClick={() => navigate('/premium')}>
            프리미엄 구독하기
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
        <h1 className="text-lg font-semibold">코치 채팅</h1>
      </header>

      <Card className="flex-1 m-0 rounded-none border-0">
        <ChatWindow
          messages={messages}
          loading={loading}
          sending={sending}
          onSendMessage={sendMessage}
          partnerName={coachName}
        />
      </Card>
    </div>
  );
}
