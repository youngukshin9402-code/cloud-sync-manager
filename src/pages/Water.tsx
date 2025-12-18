import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Droplets,
  Plus,
  Settings,
  Bell,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  getWaterLogs,
  setWaterLogs,
  getWaterSettings,
  setWaterSettings,
  WaterLog,
  WaterSettings,
  generateId,
  getTodayString,
} from "@/lib/localStorage";

export default function Water() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [settings, setSettingsState] = useState<WaterSettings>(getWaterSettings());
  const [customAmount, setCustomAmount] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const today = getTodayString();

  useEffect(() => {
    setLogs(getWaterLogs());
  }, []);

  const todayLogs = logs.filter(log => log.date === today);
  const todayTotal = todayLogs.reduce((sum, log) => sum + log.amount, 0);
  const progress = Math.min((todayTotal / settings.dailyGoal) * 100, 100);

  const addWater = (amount: number) => {
    const newLog: WaterLog = {
      id: generateId(),
      date: today,
      amount,
      timestamp: new Date().toISOString(),
    };
    const updated = [...logs, newLog];
    setLogs(updated);
    setWaterLogs(updated);
    toast({
      title: "물 섭취 기록 완료!",
      description: `${amount}ml 추가됨 (오늘 총 ${todayTotal + amount}ml)`,
    });
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (amount > 0) {
      addWater(amount);
      setCustomAmount("");
    }
  };

  const saveSettings = (newSettings: WaterSettings) => {
    setSettingsState(newSettings);
    setWaterSettings(newSettings);
    toast({ title: "설정이 저장되었습니다" });
    setSettingsOpen(false);
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

  // Calculate scheduled reminders for today
  const getScheduledReminders = () => {
    if (!settings.reminderEnabled) return [];
    
    const reminders: string[] = [];
    const [startHour, startMin] = settings.reminderStart.split(':').map(Number);
    const [endHour, endMin] = settings.reminderEnd.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      reminders.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      currentMinutes += settings.reminderInterval;
    }
    
    return reminders;
  };

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
                {/* Daily Goal */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    하루 목표 (ml)
                  </label>
                  <Input
                    type="number"
                    value={settings.dailyGoal}
                    onChange={e => setSettingsState({ ...settings, dailyGoal: parseInt(e.target.value) || 2000 })}
                  />
                </div>

                {/* Reminder Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    알림 활성화
                  </label>
                  <Switch
                    checked={settings.reminderEnabled}
                    onCheckedChange={checked => setSettingsState({ ...settings, reminderEnabled: checked })}
                  />
                </div>

                {settings.reminderEnabled && (
                  <>
                    {/* Start Time */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시작 시간</label>
                      <Input
                        type="time"
                        value={settings.reminderStart}
                        onChange={e => setSettingsState({ ...settings, reminderStart: e.target.value })}
                      />
                    </div>

                    {/* End Time */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">종료 시간</label>
                      <Input
                        type="time"
                        value={settings.reminderEnd}
                        onChange={e => setSettingsState({ ...settings, reminderEnd: e.target.value })}
                      />
                    </div>

                    {/* Interval */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">알림 간격</label>
                      <div className="flex gap-2">
                        {[60, 90, 120].map(min => (
                          <Button
                            key={min}
                            variant={settings.reminderInterval === min ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSettingsState({ ...settings, reminderInterval: min })}
                          >
                            {min}분
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Evening Reminder */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">저녁 미달 리마인드</label>
                      <Switch
                        checked={settings.eveningReminder}
                        onCheckedChange={checked => setSettingsState({ ...settings, eveningReminder: checked })}
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
              <p className="text-xl font-semibold">{settings.dailyGoal.toLocaleString()}ml</p>
            </div>
          </div>

          {/* Progress Bar */}
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
                {Math.max(0, settings.dailyGoal - todayTotal).toLocaleString()}ml 남음
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

          {/* Custom Input */}
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

          {settings.reminderEnabled ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {settings.reminderStart} ~ {settings.reminderEnd}, {settings.reminderInterval}분 간격
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  오늘 예정된 알림
                </p>
                <div className="flex flex-wrap gap-2">
                  {getScheduledReminders().map((time, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-muted rounded-full text-sm"
                    >
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
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
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
