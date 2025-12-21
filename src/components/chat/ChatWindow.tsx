import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatMessage } from './ChatMessage';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';

interface ChatWindowProps {
  messages: ChatMessageType[];
  loading: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<boolean>;
  partnerName: string;
  readOnly?: boolean;
}

export function ChatWindow({ 
  messages, 
  loading, 
  sending, 
  onSendMessage, 
  partnerName,
  readOnly = false
}: ChatWindowProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending || readOnly) return;

    const message = inputValue;
    setInputValue('');
    
    const success = await onSendMessage(message);
    if (!success) {
      setInputValue(message); // Restore on failure
    }
    
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 bg-card">
          <div className="font-semibold">{partnerName}</div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className="h-12 w-48 rounded-2xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-card">
        <h3 className="font-semibold">{partnerName}</h3>
        {readOnly && (
          <span className="text-xs text-muted-foreground">읽기 전용 모드</span>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-center">
              아직 대화가 없습니다.<br />
              {!readOnly && '첫 메시지를 보내보세요!'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.message}
                senderNickname={msg.sender_nickname || '사용자'}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === user?.id}
                isRead={msg.is_read}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="border-t p-3 bg-card">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="메시지를 입력하세요..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!inputValue.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
