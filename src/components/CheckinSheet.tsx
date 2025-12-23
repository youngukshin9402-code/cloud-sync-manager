/**
 * 체크인 전송 시트 - 마이페이지에서 사용
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { useCoaching } from '@/hooks/useCoaching';

interface CheckinSheetProps {
  trigger?: React.ReactNode;
}

export function CheckinSheet({ trigger }: CheckinSheetProps) {
  const { sendCheckin, sending, hasCoach } = useCoaching();
  const [open, setOpen] = useState(false);
  const [conditionScore, setConditionScore] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [exerciseDone, setExerciseDone] = useState(false);
  const [mealCount, setMealCount] = useState(3);
  const [notes, setNotes] = useState('');

  const conditionEmojis = ['😫', '😕', '😐', '🙂', '😊'];
  const conditionLabels = ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];

  const handleSubmit = async () => {
    const success = await sendCheckin({
      conditionScore,
      sleepHours,
      exerciseDone,
      mealCount,
      notes: notes.trim() || undefined,
    });
    
    if (success) {
      setOpen(false);
      // Reset form
      setConditionScore(3);
      setSleepHours(7);
      setExerciseDone(false);
      setMealCount(3);
      setNotes('');
    }
  };

  if (!hasCoach) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button className="w-full gap-2" variant="outline" size="lg">
            <ClipboardCheck className="w-5 h-5" />
            오늘의 활동 보내기
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>오늘 체크인</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-140px)] pb-4">
          {/* 컨디션 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">오늘 컨디션</Label>
            <div className="flex justify-between items-center">
              {conditionEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => setConditionScore(idx + 1)}
                  className={`text-3xl p-2 rounded-xl transition-all ${
                    conditionScore === idx + 1 
                      ? 'bg-primary/10 scale-110' 
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {conditionLabels[conditionScore - 1]}
            </p>
          </div>

          {/* 수면 시간 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              수면 시간: <span className="text-primary">{sleepHours}시간</span>
            </Label>
            <Slider
              value={[sleepHours]}
              onValueChange={([v]) => setSleepHours(v)}
              min={0}
              max={12}
              step={0.5}
              className="py-2"
            />
          </div>

          {/* 운동 여부 */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-base font-medium">오늘 운동했나요?</Label>
            <Switch 
              checked={exerciseDone} 
              onCheckedChange={setExerciseDone}
            />
          </div>

          {/* 식사 횟수 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              식사 횟수: <span className="text-primary">{mealCount}회</span>
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => setMealCount(count)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    mealCount === count
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">추가 메모 (선택)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="코치에게 전달하고 싶은 내용이 있다면 적어주세요"
              rows={3}
            />
          </div>
        </div>

        {/* 전송 버튼 */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={sending}
            className="w-full h-12 text-lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                전송 중...
              </>
            ) : (
              '코치에게 전송'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
