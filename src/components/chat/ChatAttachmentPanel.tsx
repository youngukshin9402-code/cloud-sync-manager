import { Smile, Image as ImageIcon, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 기본 이모지 목록
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄',
  '👍', '👎', '👏', '🙏', '💪', '❤️', '🔥', '✨',
  '🎉', '🎊', '💯', '👌', '✅', '🆗', '💬', '📸',
];

type PanelTab = 'emoji' | 'gallery' | 'camera' | null;

interface ChatAttachmentPanelProps {
  activeTab: PanelTab;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectImage: () => void;
  onOpenCamera: () => void;
}

export function ChatAttachmentPanel({
  activeTab,
  onClose,
  onSelectEmoji,
  onSelectImage,
  onOpenCamera,
}: ChatAttachmentPanelProps) {
  if (!activeTab) return null;

  return (
    <div className="border-t bg-card animate-in slide-in-from-bottom-4 duration-200">
      {/* Tab buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => activeTab !== 'emoji' && onClose()}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'emoji' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Smile className="h-6 w-6" />
            <span className="text-xs">이모지</span>
          </button>
          <button
            type="button"
            onClick={onSelectImage}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'gallery' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">사진</span>
          </button>
          <button
            type="button"
            onClick={onOpenCamera}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'camera' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">카메라</span>
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Emoji grid */}
      {activeTab === 'emoji' && (
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="text-2xl p-2 hover:bg-muted rounded-lg transition-colors active:scale-95"
                onClick={() => onSelectEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
