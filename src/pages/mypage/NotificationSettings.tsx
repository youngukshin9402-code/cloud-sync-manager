import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Utensils, Droplets, Dumbbell, MessageSquare } from "lucide-react";
import { getNotificationSettings, setNotificationSettings, NotificationSettings } from "@/lib/localStorage";

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());

  const handleToggle = (key: keyof NotificationSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setNotificationSettings(updated);
    toast({ title: "설정이 저장되었습니다" });
  };

  const notifications = [
    { key: 'mealReminder' as const, icon: Utensils, label: '식사 알림', description: '아침/점심/저녁 식사 시간 알림' },
    { key: 'waterReminder' as const, icon: Droplets, label: '물 섭취 알림', description: '정기적인 물 마시기 알림' },
    { key: 'exerciseReminder' as const, icon: Dumbbell, label: '운동 알림', description: '일일 미션 완료 알림' },
    { key: 'coachingReminder' as const, icon: MessageSquare, label: '코칭 알림', description: '코칭 예약 및 메시지 알림' },
  ];

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
          알림을 받으려면 브라우저의 알림 권한을 허용해주세요
        </p>
      </div>
    </div>
  );
}
