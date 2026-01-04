/**
 * 특정 사용자의 활동 카드를 날짜별로 보여주는 다이얼로그
 * 날짜 네비게이션으로 연속된 날짜의 활동을 확인 가능
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { CheckinReportCard } from './CheckinReportCard';
import { format, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { User, Calendar, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userNickname: string;
  initialDate?: Date; // 클릭한 날짜 (오늘의 활동에서 클릭 시)
}

interface CheckinReport {
  id: string;
  user_id: string;
  report_date: string;
  sent_at: string;
  version_number: number;
  summary: any;
  snapshot_data: any;
  user_nickname?: string;
}

export function UserActivityDialog({
  open,
  onOpenChange,
  userId,
  userNickname,
  initialDate,
}: UserActivityDialogProps) {
  const [allReports, setAllReports] = useState<CheckinReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  
  // 활동이 있는 날짜 목록
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // initialDate가 변경되면 selectedDate 업데이트
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    if (!open || !userId) return;

    const fetchReports = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('checkin_reports')
        .select('*')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })
        .order('sent_at', { ascending: false })
        .limit(365); // 최대 1년치

      const reportsWithNickname = (data || []).map(r => ({
        ...r,
        user_nickname: userNickname,
      }));

      setAllReports(reportsWithNickname);
      
      // 활동이 있는 날짜 목록 추출
      const dates = [...new Set((data || []).map(r => r.report_date))].sort((a, b) => b.localeCompare(a));
      setAvailableDates(dates);
      
      // initialDate가 없을 때만 가장 최근 활동 날짜로 설정
      if (!initialDate && dates.length > 0) {
        setSelectedDate(new Date(dates[0]));
      }
      
      setLoading(false);
    };

    fetchReports();
  }, [open, userId, userNickname, initialDate]);

  // 선택된 날짜의 리포트만 필터링
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const reportsForSelectedDate = allReports.filter(r => r.report_date === selectedDateStr);
  
  // 현재 날짜의 인덱스
  const currentDateIndex = availableDates.indexOf(selectedDateStr);
  
  // 이전/다음 날짜로 이동
  const goToPrevDate = () => {
    if (currentDateIndex < availableDates.length - 1) {
      setSelectedDate(new Date(availableDates[currentDateIndex + 1]));
    }
  };
  
  const goToNextDate = () => {
    if (currentDateIndex > 0) {
      setSelectedDate(new Date(availableDates[currentDateIndex - 1]));
    }
  };
  
  // 하루 전/후로 이동 (활동 없어도)
  const goToPrevDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };
  
  const goToNextDay = () => {
    const tomorrow = addDays(selectedDate, 1);
    if (tomorrow <= new Date()) {
      setSelectedDate(tomorrow);
    }
  };

  const hasPrevDate = currentDateIndex < availableDates.length - 1;
  const hasNextDate = currentDateIndex > 0;
  
  const canGoNextDay = addDays(selectedDate, 1) <= new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            {userNickname}님의 활동 카드
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : allReports.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{userNickname}님의 활동 카드가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 날짜 네비게이션 */}
            <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevDay}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  {format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })}
                </span>
                {reportsForSelectedDate.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {reportsForSelectedDate.length}건
                  </Badge>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextDay}
                disabled={!canGoNextDay}
                className="h-8 w-8"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* 활동 있는 날짜 퀵 네비게이션 */}
            {availableDates.length > 1 && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Button
                  variant="link"
                  size="sm"
                  onClick={goToPrevDate}
                  disabled={!hasPrevDate}
                  className="text-xs h-auto py-1"
                >
                  ← 이전 활동
                </Button>
                <span className="text-muted-foreground">|</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={goToNextDate}
                  disabled={!hasNextDate}
                  className="text-xs h-auto py-1"
                >
                  다음 활동 →
                </Button>
              </div>
            )}

            {/* 해당 날짜의 활동 카드 */}
            <ScrollArea className="max-h-[50vh]">
              {reportsForSelectedDate.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">이 날짜에는 활동 카드가 없습니다</p>
                  {availableDates.length > 0 && (
                    <p className="text-xs mt-2">
                      "이전 활동" 또는 "다음 활동" 버튼으로 활동이 있는 날짜로 이동하세요
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {reportsForSelectedDate
                    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
                    .map(report => (
                      <CheckinReportCard
                        key={report.id}
                        report={report}
                        compact={false}
                      />
                    ))
                  }
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
