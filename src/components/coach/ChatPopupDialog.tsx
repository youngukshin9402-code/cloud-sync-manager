/**
 * 채팅 팝업 다이얼로그 - 담당 회원과 빠르게 채팅할 수 있는 팝업
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Send, Loader2, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  sender_nickname?: string;
}

interface ChatPopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userNickname: string;
}

export function ChatPopupDialog({
  open,
  onOpenChange,
  userId,
  userNickname,
}: ChatPopupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages(data || []);
    setLoading(false);

    // 읽음 처리
    if (data && data.length > 0) {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', userId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    }
  };

  useEffect(() => {
    if (open && user && userId) {
      fetchMessages();
    }
  }, [open, user, userId]);

  // 스크롤을 맨 아래로 (최근 메시지 표시)
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // 약간의 딜레이 후 스크롤 (렌더링 완료 대기)
      setTimeout(() => {
        if (scrollRef.current) {
          const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);
    }
  }, [messages, loading]);

  // 실시간 메시지 구독
  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel(`chat-popup-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.receiver_id === user.id) {
            setMessages(prev => [...prev, newMsg]);
            // 읽음 처리
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user, userId]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    setSending(true);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: user.id,
        receiver_id: userId,
        message: newMessage.trim(),
        message_type: 'text',
      })
      .select()
      .single();

    setSending(false);

    if (error) {
      toast({
        title: '전송 실패',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setMessages(prev => [...prev, data]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {userNickname}님과 채팅
          </DialogTitle>
        </DialogHeader>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-3/4" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>아직 메시지가 없습니다</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        isMe ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2',
                          isMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {msg.message_type === 'image' && msg.image_url ? (
                          <img
                            src={msg.image_url}
                            alt="이미지"
                            className="rounded-lg max-w-full"
                          />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        )}
                        <p
                          className={cn(
                            'text-xs mt-1',
                            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}
                        >
                          {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="p-3 border-t bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              size="icon"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
