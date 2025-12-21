import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ChatMessageProps {
  message: string;
  senderNickname: string;
  timestamp: string;
  isOwn: boolean;
  isRead?: boolean;
}

export function ChatMessage({ message, senderNickname, timestamp, isOwn, isRead }: ChatMessageProps) {
  const formattedTime = format(new Date(timestamp), 'a h:mm', { locale: ko });

  return (
    <div className={cn('flex w-full mb-3', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {senderNickname}
          </span>
        )}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
          {isOwn && (
            <span className={cn('text-[10px]', isRead ? 'text-primary' : 'text-muted-foreground')}>
              {isRead ? '읽음' : '전송됨'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
