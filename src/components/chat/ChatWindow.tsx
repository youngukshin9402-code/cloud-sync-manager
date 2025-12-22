import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './ChatMessage';
import { ChatAttachmentPanel } from './ChatAttachmentPanel';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';

type PanelTab = 'emoji' | 'gallery' | 'camera' | null;

interface ChatWindowProps {
  messages: ChatMessageType[];
  loading: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<boolean>;
  onSendImage?: (file: File) => Promise<boolean>;
  partnerName: string;
  readOnly?: boolean;
}

export function ChatWindow({ 
  messages, 
  loading, 
  sending, 
  onSendMessage, 
  onSendImage,
  partnerName,
  readOnly = false
}: ChatWindowProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [previewImage, setPreviewImage] = useState<{ file: File; url: string } | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Check if user is near bottom
  const checkIfNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    setIsNearBottom(checkIfNearBottom());
  }, [checkIfNearBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, scrollToBottom]);

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // New message arrived
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.sender_id === user?.id;
      
      if (isOwnMessage || isNearBottom) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, user?.id, isNearBottom, scrollToBottom]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    const maxHeight = 120; // ~5 lines
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || readOnly) return;

    // Image send
    if (previewImage && onSendImage) {
      const success = await onSendImage(previewImage.file);
      if (success) {
        setPreviewImage(null);
      }
      return;
    }

    // Text send
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    const success = await onSendMessage(message);
    if (!success) {
      setInputValue(message);
    }
    
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    setPanelTab(null);
    textareaRef.current?.focus();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewImage({ file, url });
    setPanelTab(null);
    e.target.value = '';
  };

  const cancelImagePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
    }
  };

  const togglePanel = () => {
    setPanelTab(panelTab ? null : 'emoji');
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background relative">
      {/* Messages Area - flex-1 with proper scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">불러오는 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-muted-foreground text-sm">
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
                messageType={msg.message_type}
                imageUrl={msg.image_url}
                senderNickname={msg.sender_nickname || '사용자'}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === user?.id}
                isRead={msg.is_read}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && messages.length > 0 && (
        <div className="absolute bottom-24 right-4">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg"
            onClick={() => scrollToBottom('smooth')}
          >
            ↓ 최신
          </Button>
        </div>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div className="shrink-0 px-4 py-2 border-t bg-card">
          <div className="relative inline-block">
            <img 
              src={previewImage.url} 
              alt="미리보기" 
              className="h-20 rounded-lg object-cover" 
            />
            <button
              onClick={cancelImagePreview}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Attachment Panel */}
      <ChatAttachmentPanel
        activeTab={panelTab}
        onClose={() => setPanelTab(null)}
        onSelectEmoji={handleEmojiSelect}
        onSelectImage={() => imageInputRef.current?.click()}
        onOpenCamera={() => cameraInputRef.current?.click()}
      />

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Input Bar - shrink-0, sticky at bottom */}
      {!readOnly && (
        <form 
          onSubmit={handleSubmit} 
          className="shrink-0 border-t bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2">
            {/* Plus button */}
            <Button 
              type="button" 
              variant={panelTab ? 'secondary' : 'ghost'}
              size="icon" 
              className="shrink-0 mb-0.5"
              onClick={togglePanel}
            >
              <Plus className={`h-5 w-5 transition-transform ${panelTab ? 'rotate-45' : ''}`} />
            </Button>

            {/* Text input - auto-grow */}
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={previewImage ? "사진을 전송하세요" : "메시지를 입력하세요"}
              disabled={sending || !!previewImage}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none py-2 px-3"
              rows={1}
            />

            {/* Send button */}
            <Button 
              type="submit" 
              size="icon" 
              className="shrink-0 mb-0.5"
              disabled={((!inputValue.trim() && !previewImage) || sending)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
