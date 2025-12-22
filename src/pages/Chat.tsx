import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function Chat() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const assignedCoachId = profile?.assigned_coach_id ?? null;
  
  // coachName은 백그라운드 로딩, 채팅 UI는 바로 표시
  const [coachName, setCoachName] = useState<string>('코치');
  const [loadingName, setLoadingName] = useState(true);

  // 코치 이름 백그라운드 로딩
  useEffect(() => {
    if (!assignedCoachId) {
      setLoadingName(false);
      return;
    }

    const loadCoachName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', assignedCoachId)
          .maybeSingle();

        if (!error && data?.nickname) {
          setCoachName(data.nickname);
        }
      } catch (error) {
        console.error('Error loading coach name:', error);
      } finally {
        setLoadingName(false);
      }
    };

    loadCoachName();
  }, [assignedCoachId]);

  // 코치 ID가 설정된 후에만 채팅 훅 사용
  const { messages, loading, sending, sendMessage, sendImageMessage } = useChat(assignedCoachId || undefined);

  // No assigned coach
  if (!assignedCoachId) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
        <header className="shrink-0 bg-card border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">코치 채팅</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
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

  // 채팅 UI 바로 표시 (이름만 늦게 로딩)
  // 카톡 레이아웃: 헤더 고정 / 채팅 리스트만 스크롤 / 입력바 고정
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Header - shrink-0 고정 */}
      <header className="shrink-0 bg-card border-b px-4 py-3 flex items-center gap-3 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {loadingName ? '코치' : coachName} 코치
          </h1>
          <p className="text-xs text-muted-foreground">1:1 채팅</p>
        </div>
      </header>

      {/* Chat Window - flex-1 + min-h-0 (ChatWindow 내부에서 스크롤) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWindow
          messages={messages}
          loading={loading}
          sending={sending}
          onSendMessage={sendMessage}
          onSendImage={sendImageMessage}
          partnerName={loadingName ? '코치' : coachName}
        />
      </div>
    </div>
  );
}
