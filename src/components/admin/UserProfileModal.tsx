/**
 * 사용자 프로필 상세보기 모달
 * 관리자 화면에서 사용자의 신체 정보를 확인
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Ruler, Calendar, Weight, Target, Activity, HeartPulse } from 'lucide-react';

interface UserProfile {
  id: string;
  nickname: string | null;
  phone: string | null;
  user_type: string;
  subscription_tier: string | null;
}

interface NutritionSettings {
  user_id: string;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  current_weight: number | null;
  goal_weight: number | null;
  activity_level: string | null;
  conditions: string[] | null;
}

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
}

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: '거의 활동 안함',
  light: '가벼운 활동',
  moderate: '보통 활동',
  active: '활발한 활동',
  very_active: '매우 활발한 활동',
};

export function UserProfileModal({ open, onOpenChange, user }: UserProfileModalProps) {
  const [settings, setSettings] = useState<NutritionSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchSettings();

      // Realtime subscription for live updates
      const channel = supabase
        .channel(`nutrition-settings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nutrition_settings',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              setSettings(payload.new as NutritionSettings);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, user]);

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('nutrition_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch nutrition settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            프로필 상세보기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {user.nickname?.[0] || '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-lg">{user.nickname || '이름없음'}</p>
                <p className="text-sm text-muted-foreground">{user.phone || '-'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {user.user_type === 'guardian' ? '보호자' : '일반'}
              </Badge>
              {user.subscription_tier === 'premium' && (
                <Badge className="bg-amber-100 text-amber-700">프리미엄</Badge>
              )}
            </div>
          </div>

          {/* 신체 정보 */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : settings ? (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">신체 정보</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <User className="w-4 h-4" />
                    성별
                  </div>
                  <p className="font-medium">
                    {settings.gender === 'male' ? '남성' : settings.gender === 'female' ? '여성' : '-'}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    만 나이
                  </div>
                  <p className="font-medium">{settings.age ? `${settings.age}세` : '-'}</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Ruler className="w-4 h-4" />
                    키
                  </div>
                  <p className="font-medium">{settings.height_cm ? `${settings.height_cm}cm` : '-'}</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Weight className="w-4 h-4" />
                    현재 체중
                  </div>
                  <p className="font-medium">{settings.current_weight ? `${settings.current_weight}kg` : '-'}</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Target className="w-4 h-4" />
                    목표 체중
                  </div>
                  <p className="font-medium">{settings.goal_weight ? `${settings.goal_weight}kg` : '-'}</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Activity className="w-4 h-4" />
                    활동수준
                  </div>
                  <p className="font-medium text-sm">
                    {settings.activity_level
                      ? ACTIVITY_LEVEL_LABELS[settings.activity_level] || settings.activity_level
                      : '-'}
                  </p>
                </div>
              </div>

              {/* 지병 */}
              {settings.conditions && settings.conditions.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <HeartPulse className="w-4 h-4" />
                    지병
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.conditions.map((condition, idx) => (
                      <Badge key={idx} variant="outline">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <HeartPulse className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">등록된 신체 정보가 없습니다</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
