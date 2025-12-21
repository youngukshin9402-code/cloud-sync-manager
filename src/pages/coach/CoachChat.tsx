import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChat, ChatPartner } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function CoachChat() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const [selectedUser, setSelectedUser] = useState<ChatPartner | null>(null);

  const { chatPartners, loading: loadingPartners, refreshPartners } = useChat();
  const { 
    messages, 
    loading: loadingMessages, 
    sending, 
    sendMessage,
    refreshMessages
  } = useChat(selectedUser?.id);

  // Set selected user from URL params or list
  useEffect(() => {
    if (userId && chatPartners.length > 0) {
      const partner = chatPartners.find(p => p.id === userId);
      if (partner) setSelectedUser(partner);
    } else if (!userId && chatPartners.length > 0 && !selectedUser) {
      setSelectedUser(chatPartners[0]);
    }
  }, [userId, chatPartners, selectedUser]);

  const handleSelectUser = (partner: ChatPartner) => {
    setSelectedUser(partner);
    navigate(`/coach/chat/${partner.id}`, { replace: true });
  };

  const handleSendMessage = async (message: string) => {
    const success = await sendMessage(message);
    if (success) {
      refreshPartners();
    }
    return success;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/coach')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">사용자 채팅</h1>
      </header>

      <div className="flex-1 flex">
        {/* User List - Mobile: Hidden when user selected, Desktop: Always visible */}
        <div className={cn(
          'w-full md:w-80 border-r bg-card flex-shrink-0',
          selectedUser ? 'hidden md:flex md:flex-col' : 'flex flex-col'
        )}>
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>배정된 사용자 ({chatPartners.length}명)</span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loadingPartners ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : chatPartners.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4 text-center">
                <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                <p>배정된 사용자가 없습니다</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {chatPartners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => handleSelectUser(partner)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
                      'hover:bg-accent',
                      selectedUser?.id === partner.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{partner.nickname}</span>
                      {(partner.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-[20px] text-xs">
                          {partner.unread_count}
                        </Badge>
                      )}
                    </div>
                    {partner.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {partner.last_message}
                      </p>
                    )}
                    {partner.last_message_time && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(partner.last_message_time), 'M/d a h:mm', { locale: ko })}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className={cn(
          'flex-1 flex flex-col',
          !selectedUser && 'hidden md:flex'
        )}>
          {selectedUser ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden border-b px-4 py-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedUser(null)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  목록으로
                </Button>
              </div>
              <ChatWindow
                messages={messages}
                loading={loadingMessages}
                sending={sending}
                onSendMessage={handleSendMessage}
                partnerName={selectedUser.nickname}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>사용자를 선택하여 채팅을 시작하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
