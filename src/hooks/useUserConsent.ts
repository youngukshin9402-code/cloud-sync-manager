import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserConsent {
  id: string;
  user_id: string;
  terms_agreed: boolean;
  privacy_agreed: boolean;
  health_info_agreed: boolean;
  marketing_agreed: boolean;
  agreed_at: string | null;
}

export function useUserConsent() {
  const { user } = useAuth();
  const [consent, setConsent] = useState<UserConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRequiredConsents, setHasRequiredConsents] = useState(false);

  const fetchConsent = useCallback(async () => {
    if (!user) {
      setConsent(null);
      setHasRequiredConsents(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConsent(data);
        setHasRequiredConsents(
          data.terms_agreed && 
          data.privacy_agreed && 
          data.health_info_agreed
        );
      } else {
        setConsent(null);
        setHasRequiredConsents(false);
      }
    } catch (error) {
      console.error('Error fetching consent:', error);
      setConsent(null);
      setHasRequiredConsents(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  const saveConsent = async (consents: {
    terms_agreed: boolean;
    privacy_agreed: boolean;
    health_info_agreed: boolean;
    marketing_agreed: boolean;
  }) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('user_consents')
        .upsert({
          user_id: user.id,
          ...consents,
          agreed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      setConsent(data);
      setHasRequiredConsents(
        data.terms_agreed && 
        data.privacy_agreed && 
        data.health_info_agreed
      );

      return { data, error: null };
    } catch (error) {
      console.error('Error saving consent:', error);
      return { data: null, error };
    }
  };

  return {
    consent,
    loading,
    hasRequiredConsents,
    saveConsent,
    refetch: fetchConsent,
  };
}
