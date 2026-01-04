/**
 * 코칭 기록 다이얼로그 - 코치가 1:1 코칭 상담을 기록할 수 있는 팝업
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Video, Clock, User, Plus, Loader2, Trash2 } from 'lucide-react';

interface CoachingRecord {
  id: string;
  user_id: string;
  session_date: string;
  session_time: string;
  notes: string | null;
  created_at: string;
  user_nickname?: string;
}

interface AssignedUser {
  id: string;
  nickname: string;
}

interface CoachingRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoachingRecordsDialog({
  open,
  onOpenChange,
}: CoachingRecordsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<CoachingRecord[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 새 기록 폼
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionTime, setSessionTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 담당 사용자 목록
    const { data: users } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('assigned_coach_id', user.id);

    setAssignedUsers(users || []);

    const nicknameMap = new Map((users || []).map(u => [u.id, u.nickname]));

    // 코칭 기록 가져오기 (오늘 기준으로)
    const { data: recordsData } = await supabase
      .from('coaching_records')
      .select('*')
      .eq('coach_id', user.id)
      .order('session_date', { ascending: false })
      .order('session_time', { ascending: false })
      .limit(50);

    const recordsWithNicknames = (recordsData || []).map(record => ({
      ...record,
      user_nickname: nicknameMap.get(record.user_id) || '사용자',
    }));

    setRecords(recordsWithNicknames);
    setLoading(false);
  };

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const handleAddRecord = async () => {
    if (!user || !selectedUserId) return;

    setSaving(true);

    const { error } = await supabase
      .from('coaching_records')
      .insert({
        coach_id: user.id,
        user_id: selectedUserId,
        session_date: sessionDate,
        session_time: sessionTime,
        notes: notes || null,
      });

    setSaving(false);

    if (error) {
      toast({
        title: '기록 실패',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: '기록 완료',
      description: '코칭 상담 기록이 저장되었습니다.',
    });

    // 폼 초기화
    setSelectedUserId('');
    setNotes('');
    setShowAddForm(false);

    // 목록 새로고침
    fetchData();
  };

  const handleDeleteRecord = async (recordId: string) => {
    const { error } = await supabase
      .from('coaching_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      toast({
        title: '삭제 실패',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setRecords(prev => prev.filter(r => r.id !== recordId));
    toast({ title: '기록 삭제됨' });
  };

  // 날짜별 그룹핑
  const groupedByDate = records.reduce((acc, record) => {
    const date = record.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, CoachingRecord[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-sky-600" />
            코칭 상담 기록
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* 새 기록 추가 버튼 / 폼 */}
            {!showAddForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                새 코칭 기록 추가
              </Button>
            ) : (
              <div className="bg-muted/50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>회원 선택</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="회원을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignedUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nickname || '이름없음'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>날짜</Label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>시간</Label>
                    <Input
                      type="time"
                      value={sessionTime}
                      onChange={(e) => setSessionTime(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>메모 (선택)</Label>
                    <Textarea
                      placeholder="코칭 내용을 간단히 메모하세요..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    취소
                  </Button>
                  <Button size="sm" onClick={handleAddRecord} disabled={!selectedUserId || saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    저장
                  </Button>
                </div>
              </div>
            )}

            {/* 기록 목록 */}
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>아직 기록된 코칭 상담이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {sortedDates.map(date => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1 z-10">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {groupedByDate[date].length}건
                      </span>
                    </div>
                    <div className="space-y-2">
                      {groupedByDate[date].map(record => (
                        <div
                          key={record.id}
                          className="bg-muted/30 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-sky-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{record.user_nickname}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {record.session_time.slice(0, 5)}
                                {record.notes && (
                                  <span className="text-muted-foreground truncate max-w-[150px]">
                                    - {record.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
