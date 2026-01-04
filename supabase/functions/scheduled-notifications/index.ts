import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationSettings {
  user_id: string;
  meal_reminder: boolean;
  water_reminder: boolean;
  exercise_reminder: boolean;
  coaching_reminder: boolean;
  default_reminder: boolean;
}

interface UserActivity {
  user_id: string;
  last_active_at: string;
}

interface PushToken {
  user_id: string;
  token: string;
  platform: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 현재 KST 시간 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstHour = kstNow.getUTCHours();
    const kstMinute = kstNow.getUTCMinutes();

    console.log(`Scheduled notification check at KST ${kstHour}:${kstMinute.toString().padStart(2, '0')}`);

    // 알림 설정이 있는 모든 사용자 조회
    const { data: allSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*');

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      throw settingsError;
    }

    // 사용자 활동 기록 조회
    const { data: activities, error: activityError } = await supabase
      .from('user_activity')
      .select('*');

    if (activityError) {
      console.error('Error fetching user activity:', activityError);
    }

    const activityMap = new Map<string, UserActivity>();
    (activities || []).forEach((a: UserActivity) => {
      activityMap.set(a.user_id, a);
    });

    const notifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    for (const settings of (allSettings || []) as NotificationSettings[]) {
      const activity = activityMap.get(settings.user_id);
      const lastActive = activity ? new Date(activity.last_active_at) : null;
      
      // 현재 앱 접속 중인지 확인 (5분 이내 활동)
      const isCurrentlyActive = lastActive && 
        (now.getTime() - lastActive.getTime()) < 5 * 60 * 1000;

      // 활동 중이면 스케줄 알림 스킵
      if (isCurrentlyActive) {
        continue;
      }

      // 식사 알림 (7시, 12시, 18시)
      if (settings.meal_reminder) {
        if (kstHour === 7 && kstMinute >= 0 && kstMinute < 5) {
          notifications.push({
            user_id: settings.user_id,
            type: 'meal_reminder',
            title: '아침 식사 알림',
            message: '아침 식사는 하셨나요? 행복한 하루를 만들어봅시다',
          });
        } else if (kstHour === 12 && kstMinute >= 0 && kstMinute < 5) {
          notifications.push({
            user_id: settings.user_id,
            type: 'meal_reminder',
            title: '점심 식사 알림',
            message: '점심 식사는 하셨나요? 어떤 음식을 드셨나요?',
          });
        } else if (kstHour === 18 && kstMinute >= 0 && kstMinute < 5) {
          notifications.push({
            user_id: settings.user_id,
            type: 'meal_reminder',
            title: '저녁 식사 알림',
            message: '저녁 식사는 하셨나요? 오늘도 고생 많으셨어요',
          });
        }
      }

      // 물 섭취 알림 (8시, 13시, 19시)
      if (settings.water_reminder) {
        if ((kstHour === 8 || kstHour === 13 || kstHour === 19) && kstMinute >= 0 && kstMinute < 5) {
          notifications.push({
            user_id: settings.user_id,
            type: 'water_reminder',
            title: '물 섭취 알림',
            message: '물 한잔 마셔가는 여유, 어떨까요?',
          });
        }
      }

      // 운동 알림 (18:30)
      if (settings.exercise_reminder) {
        if (kstHour === 18 && kstMinute >= 30 && kstMinute < 35) {
          notifications.push({
            user_id: settings.user_id,
            type: 'exercise_reminder',
            title: '운동 알림',
            message: '오늘 운동은 하셨나요? 하루를 건강하게 마무리해봅시다',
          });
        }
      }

      // 기본 알림 (12시간 이상 미접속)
      if (settings.default_reminder && lastActive) {
        const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
        if (hoursSinceActive >= 12 && hoursSinceActive < 12.5) {
          notifications.push({
            user_id: settings.user_id,
            type: 'default_reminder',
            title: '안녕하세요',
            message: '혹시 무슨 일이 있으신가요? 오늘 많이 바쁘신가봐요',
          });
        }
      }
    }

    // 알림 저장
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }

      console.log(`Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_created: notifications.length,
        timestamp: kstNow.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error in scheduled-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});