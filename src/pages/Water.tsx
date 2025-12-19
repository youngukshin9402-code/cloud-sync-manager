import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWaterLogs } from "@/hooks/useServerSync";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Droplets,
  Plus,
  Settings,
  Bell,
  Clock,
  Target,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface WaterSettings {
  daily_goal: number;
  reminder_enabled: boolean;
  reminder_start: string;
  reminder_end: string;
  reminder_interval: number;
  evening_reminder: boolean;
}

const defaultSettings: WaterSettings = {
  daily_goal: 2000,
  reminder_enabled: false,
  reminder_start: '08:00',
  reminder_end: '22:00',
  reminder_interval: 90,
  evening_reminder: true,
};

export default function Water() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: logs, loading, add, getTodayTotal } = useWaterLogs();
  const { addWater: addWaterToDailyData } = useDailyData();
  const [settings, setSettingsState] = useState<WaterSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(log => log.date === today);
  const todayTotal = getTodayTotal(today);
  const progress = Math.min((todayTotal / settings.daily_goal) * 100, 100);

  // Fetch water settings from server
  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('water_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettingsState({
          daily_goal: data.daily_goal,
          reminder_enabled: data.reminder_enabled || false,
          reminder_start: data.reminder_start || '08:00',
          reminder_end: data.reminder_end || '22:00',
          reminder_interval: data.reminder_interval || 90,
          evening_reminder: data.evening_reminder || true,
        });
      }
    } catch (error) {
      console.error('Error fetching water settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const addWater = async (amount: number) => {
    const result = await add({ date: today, amount });
    if (result.error) {
      toast({ title: "저장 실패", variant: "destructive" });
    } else {
      addWaterToDailyData(amount); // Dashboard/오늘요약 즉시 반영
      toast({
        title: "물 섭취 기록 완료!",
        description: `${amount}ml 추가됨 (오늘 총 ${todayTotal + amount}ml)`,
      });
    }
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (amount > 0) {
      addWater(amount);
      setCustomAmount("");
    }
  };

  const saveSettings = async (newSettings: WaterSettings) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('water_settings')
        .upsert({
          user_id: user.id,
          daily_goal: newSettings.daily_goal,
          reminder_enabled: newSettings.reminder_enabled,
          reminder_start: newSettings.reminder_start,
          reminder_end: newSettings.reminder_end,
          reminder_interval: newSettings.reminder_interval,
          evening_reminder: newSettings.evening_reminder,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      setSettingsState(newSettings);
      toast({ title: "설정이 저장되었습니다" });
      setSettingsOpen(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: "설정 저장 실패", variant: "destructive" });
    }
  };

  const testReminder = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("💧 물 마실 시간이에요!", {
            body: "건강을 위해 물 한 잔 마셔주세요.",
            icon: "/favicon.ico",
          });
          toast({ title: "테스트 알림이 전송되었습니다!" });
        } else {
          toast({ 
            title: "알림 권한이 필요합니다", 
            description: "브라우저 설정에서 알림을 허용해 주세요.",
            variant: "destructive" 
          });
        }
      });
    }
  };

  const getScheduledReminders = () => {
    if (!settings.reminder_enabled) return [];
    
    const reminders: string[] = [];
    const [startHour, startMin] = settings.reminder_start.split(':').map(Number);
    const [endHour, endMin] = settings.reminder_end.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      reminders.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      currentMinutes += settings.reminder_interval;
    }
    
    return reminders;
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">물 섭취</h1>
          </div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>물 섭취 설정</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    하루 목표 (ml)
                  </label>
                  <Input
                    type="number"
                    value={settings.daily_goal}
                    onChange={e => setSettingsState({ ...settings, daily_goal: parseInt(e.target.value) || 2000 })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    알림 활성화
                  </label>
                  <Switch
                    checked={settings.reminder_enabled}
                    onCheckedChange={checked => setSettingsState({ ...settings, reminder_enabled: checked })}
                  />
                </div>

                {settings.reminder_enabled && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시작 시간</label>
                      <Input
                        type="time"
                        value={settings.reminder_start}
                        onChange={e => setSettingsState({ ...settings, reminder_start: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">종료 시간</label>
                      <Input
                        type="time"
                        value={settings.reminder_end}
                        onChange={e => setSettingsState({ ...settings, reminder_end: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">알림 간격</label>
                      <div className="flex gap-2">
                        {[60, 90, 120].map(min => (
                          <Button
                            key={min}
                            variant={settings.reminder_interval === min ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSettingsState({ ...settings, reminder_interval: min })}
                          >
                            {min}분
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">저녁 미달 리마인드</label>
                      <Switch
                        checked={settings.evening_reminder}
                        onCheckedChange={checked => setSettingsState({ ...settings, evening_reminder: checked })}
                      />
                    </div>
                  </>
                )}

                <Button className="w-full" onClick={() => saveSettings(settings)}>
                  설정 저장
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Progress Card */}
        <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-health-blue/10 flex items-center justify-center">
                <Droplets className="w-8 h-8 text-health-blue" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">오늘 섭취량</p>
                <p className="text-3xl font-bold text-foreground">
                  {todayTotal.toLocaleString()}
                  <span className="text-lg font-normal text-muted-foreground">ml</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">목표</p>
              <p className="text-xl font-semibold">{settings.daily_goal.toLocaleString()}ml</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-health-blue transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{Math.round(progress)}% 달성</span>
              <span className="text-muted-foreground">
                {Math.max(0, settings.daily_goal - todayTotal).toLocaleString()}ml 남음
              </span>
            </div>
          </div>

          {progress >= 100 && (
            <div className="bg-health-green/10 text-health-green rounded-xl p-3 text-center font-medium">
              🎉 오늘 목표를 달성했어요!
            </div>
          )}
        </div>

        {/* Quick Add Buttons */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">빠른 추가</h2>
          <div className="grid grid-cols-3 gap-3">
            {[200, 300, 500].map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="lg"
                className="h-16 text-lg font-semibold"
                onClick={() => addWater(amount)}
              >
                <Plus className="w-5 h-5 mr-1" />
                {amount}ml
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="직접 입력 (ml)"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="text-lg"
            />
            <Button onClick={handleCustomAdd} disabled={!customAmount}>
              추가
            </Button>
          </div>
        </div>

        {/* Reminder Section */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              알림 설정
            </h2>
            <Button variant="outline" size="sm" onClick={testReminder}>
              테스트
            </Button>
          </div>

          {settings.reminder_enabled ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {settings.reminder_start} ~ {settings.reminder_end}, {settings.reminder_interval}분 간격
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  오늘 예정된 알림
                </p>
                <div className="flex flex-wrap gap-2">
                  {getScheduledReminders().map((time, idx) => (
                    <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm">
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              알림이 꺼져 있습니다. 설정에서 켜주세요.
            </p>
          )}
        </div>

        {/* Today's Log */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            오늘 기록
          </h2>
          {todayLogs.length > 0 ? (
            <div className="space-y-2">
              {todayLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
                >
                  <span className="text-muted-foreground">
                    {new Date(log.logged_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-semibold">+{log.amount}ml</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Droplets className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>오늘 기록이 없습니다</p>
              <p className="text-sm">물 한 잔 마시고 기록해 보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
