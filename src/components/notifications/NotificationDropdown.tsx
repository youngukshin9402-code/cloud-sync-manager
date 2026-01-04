import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, MessageCircle, Stethoscope, Trash2, Utensils, Droplets, Dumbbell, BellRing, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  // 4초 후 자동으로 토스트 닫기 (새 알림에 대해)
  useEffect(() => {
    if (unreadCount > 0 && open) {
      const timer = setTimeout(() => {
        // 알림 패널은 열려있지만 자동으로 읽음 처리하지 않음
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, open]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'health_comment':
        return <Stethoscope className="w-4 h-4 text-health-green" />;
      case 'coaching_feedback':
      case 'chat_message':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'support_reply':
      case 'support_new':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'meal_reminder':
        return <Utensils className="w-4 h-4 text-orange-500" />;
      case 'water_reminder':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      case 'exercise_reminder':
        return <Dumbbell className="w-4 h-4 text-green-500" />;
      case 'default_reminder':
        return <BellRing className="w-4 h-4 text-yellow-500" />;
      case 'coach_assigned':
        return <UserCheck className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // 관련 페이지로 이동
    if (notification.related_type === 'health_record') {
      navigate('/medical');
    } else if (notification.related_type === 'coaching_session') {
      navigate('/mypage/coaching-feedback');
    } else if (notification.related_type === 'support_ticket') {
      if (notification.type === 'support_new') {
        navigate('/admin/tickets');
      } else {
        navigate('/mypage/support');
      }
    } else if (notification.type === 'chat_message') {
      navigate('/chat');
    } else if (notification.type === 'coach_assigned') {
      navigate('/chat');
    }

    setOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  // 삭제되지 않은 알림만 표시
  const visibleNotifications = notifications.filter(n => !n.is_deleted);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              모두 읽음
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {visibleNotifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3 group cursor-pointer",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm line-clamp-1",
                        !notification.is_read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, notification.id)}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true, 
                        locale: ko 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}