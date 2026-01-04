import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, Utensils, Droplets, Dumbbell, MessageSquare, BellRing } from "lucide-react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationSettingsPage() {
  const { settings, loading, updateSettings } = useNotificationSettings();
  const { permission, requestPermission, isSupported } = usePushNotifications();

  const handleToggle = async (key: keyof typeof settings) => {
    await updateSettings({ [key]: !settings[key] });
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      alert('브라우저 설정에서 알림 권한을 허용해주세요.');
    }
  };

  const notifications = [
    { 
      key: 'default_reminder' as const, 
      icon: BellRing, 
      label: '기본 알림', 
      description: '12시간 이상 미접속 시 알림' 
    },
    { 
      key: 'meal_reminder' as const, 
      icon: Utensils, 
      label: '식사 알림', 
      description: '오전 7시, 오후 12시, 오후 6시 알림' 
    },
    { 
      key: 'water_reminder' as const, 
      icon: Droplets, 
      label: '물 섭취 알림', 
      description: '오전 8시, 오후 1시, 오후 7시 알림' 
    },
    { 
      key: 'exercise_reminder' as const, 
      icon: Dumbbell, 
      label: '운동 알림', 
      description: '오후 6시 30분 알림' 
    },
    { 
      key: 'coaching_reminder' as const, 
      icon: MessageSquare, 
      label: '코칭 알림', 
      description: '코치 채팅 메시지 알림' 
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profile">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">알림 설정</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">알림 설정</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 브라우저 알림 권한 요청 */}
        {isSupported && permission !== 'granted' && (
          <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">브라우저 알림 권한</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  앱을 사용하지 않을 때도 알림을 받으려면 권한을 허용해주세요
                </p>
                <Button 
                  size="sm" 
                  onClick={handleRequestPermission}
                  className="h-8"
                >
                  {permission === 'denied' ? '설정에서 허용하기' : '알림 권한 허용'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 알림 설정 목록 */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {notifications.map((item, index) => (
            <div
              key={item.key}
              className={`flex items-center justify-between p-4 ${
                index !== notifications.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={() => handleToggle(item.key)}
              />
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center px-4">
          {isSupported && permission === 'granted' 
            ? '✓ 브라우저 알림이 활성화되어 있습니다'
            : '알림을 받으려면 브라우저의 알림 권한을 허용해주세요'}
        </p>
      </div>
    </div>
  );
}