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

export function useGuardianConnection() {
  const { user, profile } = useAuth();
  const [connections, setConnections] = useState<GuardianConnection[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          const otherUserId = conn.user_id === user.id ? conn.guardian_id : conn.user_id;
          const { data: profileData } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", otherUserId)
            .single();

          return {
            ...conn,
            user_nickname: conn.user_id === user.id ? profile?.nickname : profileData?.nickname,
            guardian_nickname: conn.guardian_id === user.id ? profile?.nickname : profileData?.nickname,
          };
        })
      );

      setConnections(connectionsWithNicknames);

      // Check for pending code
      const myPendingConnection = data?.find(
        (c) => c.user_id === user.id && c.connection_code && new Date(c.code_expires_at!) > new Date()
      );

      if (myPendingConnection) {
        setPendingCode(myPendingConnection.connection_code);
        setCodeExpiresAt(new Date(myPendingConnection.code_expires_at!));
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  // Generate a 6-digit connection code
  const generateConnectionCode = async () => {
    if (!user) return null;

    try {
      const code = Math.random().toString().slice(2, 8);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Check if user already has a pending connection (guardian_id is null)
      const { data: existing } = await supabase
        .from("guardian_connections")
        .select("id")
        .eq("user_id", user.id)
        .is("guardian_id", null)
        .maybeSingle();

      if (existing) {
        // Update existing pending connection
        const { error } = await supabase
          .from("guardian_connections")
          .update({
            connection_code: code,
            code_expires_at: expiresAt.toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new pending connection with guardian_id = null
        const { error } = await supabase.from("guardian_connections").insert([{
          user_id: user.id,
          guardian_id: null, // null = pending state
          connection_code: code,
          code_expires_at: expiresAt.toISOString(),
        }]);

        if (error) throw error;
      }

      setPendingCode(code);
      setCodeExpiresAt(expiresAt);
      toast.success("연결 코드가 생성되었어요!");
      return code;
    } catch (error) {
      console.error("Error generating code:", error);
      toast.error("코드 생성에 실패했습니다");
      return null;
    }
  };

  // Connect as guardian using code (via RPC for RLS bypass)
  const connectWithCode = async (code: string) => {
    if (!user) return false;

    try {
      // Use RPC function for secure connection
      const { data, error } = await supabase.rpc('connect_guardian_with_code', {
        p_code: code
      });

      if (error) {
        console.error("RPC error:", error);
        toast.error("연결에 실패했습니다");
        return false;
      }

      const result = data as { success: boolean; error?: string; connection_id?: string };

      if (!result.success) {
        if (result.error === 'invalid_code') {
          toast.error("유효하지 않은 코드예요. 다시 확인해주세요.");
        } else if (result.error === 'self_connection') {
          toast.error("자기 자신과는 연결할 수 없어요.");
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

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user, fetchConnections]);

  return {
    connections,
    pendingCode,
    codeExpiresAt,
    isLoading,
    generateConnectionCode,
    connectWithCode,
    fetchConnections,
  };
}
