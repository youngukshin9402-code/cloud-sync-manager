import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 브라우저 알림 지원 확인
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // 알림 클릭 시 앱으로 포커스
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 5초 후 자동 닫기
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  // 사용자 활동 기록 업데이트
  const updateActivity = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_activity')
        .upsert(
          { 
            user_id: user.id, 
            last_active_at: new Date().toISOString() 
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error updating activity:', error);
      }
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  }, [user]);

  // 앱 활동 추적 (페이지 포커스, 클릭 등)
  useEffect(() => {
    if (!user) return;

    // 초기 활동 기록
    updateActivity();

    // 5분마다 활동 기록 업데이트
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    // 페이지 포커스 시 활동 기록
    const handleFocus = () => updateActivity();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, updateActivity]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    updateActivity,
  };
}