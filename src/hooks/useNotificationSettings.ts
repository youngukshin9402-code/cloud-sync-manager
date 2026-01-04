import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettingsData {
  meal_reminder: boolean;
  water_reminder: boolean;
  exercise_reminder: boolean;
  coaching_reminder: boolean;
  default_reminder: boolean;
}

const defaultSettings: NotificationSettingsData = {
  meal_reminder: true,
  water_reminder: true,
  exercise_reminder: true,
  coaching_reminder: true,
  default_reminder: true,
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
        return;
      }

      if (data) {
        setSettings({
          meal_reminder: data.meal_reminder ?? true,
          water_reminder: data.water_reminder ?? true,
          exercise_reminder: data.exercise_reminder ?? true,
          coaching_reminder: data.coaching_reminder ?? true,
          default_reminder: data.default_reminder ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettingsData>) => {
    if (!user) return false;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating notification settings:', error);
        toast({
          title: '설정 저장 실패',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      setSettings(updatedSettings);
      toast({ title: '설정이 저장되었습니다' });
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }, [user, settings, toast]);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}