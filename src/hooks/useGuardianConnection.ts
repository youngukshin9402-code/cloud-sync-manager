import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GuardianConnection {
  id: string;
  user_id: string;
  guardian_id: string;
  connection_code: string | null;
  code_expires_at: string | null;
  connected_at: string;
  user_nickname?: string;
  guardian_nickname?: string;
}

interface PhoneVerificationResult {
  success: boolean;
  code?: string;
  expires_in_minutes?: number;
  error?: string;
}

interface ConnectionResult {
  success: boolean;
  connection_id?: string;
  error?: string;
}

export function useGuardianConnection() {
  const { user, profile } = useAuth();
  const [connections, setConnections] = useState<GuardianConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 휴대전화 인증 관련 상태
  const [pendingVerificationCode, setPendingVerificationCode] = useState<string | null>(null);
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<Date | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("guardian_connections")
        .select("*")
        .or(`user_id.eq.${user.id},guardian_id.eq.${user.id}`);

      if (error) throw error;

      // Fetch nicknames for each connection
      const connectionsWithNicknames = await Promise.all(
        (data || []).map(async (conn) => {
          // 피보호자(user_id)와 보호자(guardian_id)의 닉네임을 각각 조회
          const userIdToFetch = conn.user_id;
          const guardianIdToFetch = conn.guardian_id;
          
          let userNickname = '';
          let guardianNickname = '';
          
          // 피보호자 닉네임 조회
          if (userIdToFetch) {
            if (userIdToFetch === user.id) {
              userNickname = profile?.nickname || '사용자';
            } else {
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("nickname")
                .eq("id", userIdToFetch)
                .single();
              userNickname = userProfile?.nickname || '사용자';
            }
          }
          
          // 보호자 닉네임 조회
          if (guardianIdToFetch) {
            if (guardianIdToFetch === user.id) {
              guardianNickname = profile?.nickname || '보호자';
            } else {
              const { data: guardianProfile } = await supabase
                .from("profiles")
                .select("nickname")
                .eq("id", guardianIdToFetch)
                .single();
              guardianNickname = guardianProfile?.nickname || '보호자';
            }
          }

          return {
            ...conn,
            user_nickname: userNickname,
            guardian_nickname: guardianNickname,
          };
        })
      );

      // 실제 연결만 필터링 (guardian_id가 있는 것)
      const validConnections = connectionsWithNicknames.filter(c => c.guardian_id);
      setConnections(validConnections);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  // 휴대전화 인증 코드 생성 (사용자가 보호자에게 전달)
  const generatePhoneVerificationCode = async (phone: string) => {
    if (!user || !phone) {
      toast.error("휴대전화 번호를 입력해주세요");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('generate_phone_verification_code', {
        p_phone: phone,
        p_purpose: 'guardian_connection'
      });

      if (error) throw error;

      const result = data as unknown as PhoneVerificationResult;

      if (result.success && result.code) {
        setPendingVerificationCode(result.code);
        setVerificationExpiresAt(new Date(Date.now() + (result.expires_in_minutes || 5) * 60 * 1000));
        
        // Mock 모드: 콘솔에 코드 출력 (실제 SMS 대신)
        console.log(`[Mock SMS] 인증 코드: ${result.code} (${phone}로 발송됨)`);
        toast.success(`인증 코드가 생성되었습니다. (Mock: ${result.code})`);
        
        return result.code;
      } else {
        toast.error("인증 코드 생성에 실패했습니다");
        return null;
      }
    } catch (error) {
      console.error("Error generating verification code:", error);
      toast.error("인증 코드 생성에 실패했습니다");
      return null;
    }
  };

  // 보호자가 인증 코드로 연결 (휴대전화 번호 + 인증 코드)
  const connectWithPhoneVerification = async (targetPhone: string, verificationCode: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('connect_guardian_with_phone_verification', {
        p_target_user_phone: targetPhone,
        p_verification_code: verificationCode
      });

      if (error) {
        console.error("RPC error:", error);
        toast.error("연결에 실패했습니다");
        return false;
      }

      const result = data as unknown as ConnectionResult;

      if (!result.success) {
        if (result.error === 'invalid_code') {
          toast.error("유효하지 않은 인증 코드예요. 다시 확인해주세요.");
        } else if (result.error === 'self_connection') {
          toast.error("자기 자신과는 연결할 수 없어요.");
        } else if (result.error === 'already_connected') {
          toast.error("이미 연결된 사용자입니다.");
        } else {
          toast.error("연결에 실패했습니다");
        }
        return false;
      }

      toast.success("연결이 완료되었어요!");
      await fetchConnections();
      return true;
    } catch (error) {
      console.error("Error connecting:", error);
      toast.error("연결에 실패했습니다");
      return false;
    }
  };

  // 연결 해제 (양방향 - 사용자 또는 보호자 둘 다 가능)
  const disconnectGuardian = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("guardian_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      toast.success("연결이 해제되었습니다");
      await fetchConnections();
      return true;
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("연결 해제에 실패했습니다");
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user, fetchConnections]);

  return {
    connections,
    isLoading,
    pendingVerificationCode,
    verificationExpiresAt,
    generatePhoneVerificationCode,
    connectWithPhoneVerification,
    disconnectGuardian,
    fetchConnections,
  };
}
