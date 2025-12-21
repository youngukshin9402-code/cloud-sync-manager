import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_nickname?: string;
}

export interface ChatPartner {
  id: string;
  nickname: string;
  user_type: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
}

export function useChat(partnerId?: string) {
  const { user, profile, isCoach, isAdmin } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch chat partners for coach (assigned users) or for admin (all users with chats)
  const fetchChatPartners = useCallback(async () => {
    if (!user) return;

    try {
      if (isAdmin) {
        // Admin: get all unique chat participants
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('sender_id, receiver_id')
          .order('created_at', { ascending: false });

        if (messages) {
          const uniqueUserIds = new Set<string>();
          messages.forEach(msg => {
            uniqueUserIds.add(msg.sender_id);
            uniqueUserIds.add(msg.receiver_id);
          });

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nickname, user_type')
            .in('id', Array.from(uniqueUserIds));

          if (profiles) {
            setChatPartners(profiles.map(p => ({
              id: p.id,
              nickname: p.nickname || '사용자',
              user_type: p.user_type
            })));
          }
        }
      } else if (isCoach) {
        // Coach: get assigned users
        const { data: assignedUsers } = await supabase
          .from('profiles')
          .select('id, nickname, user_type')
          .eq('assigned_coach_id', user.id);

        if (assignedUsers) {
          // Get unread counts for each user
          const partnersWithUnread = await Promise.all(
            assignedUsers.map(async (u) => {
              const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', u.id)
                .eq('receiver_id', user.id)
                .eq('is_read', false);

              const { data: lastMsg } = await supabase
                .from('chat_messages')
                .select('message, created_at')
                .or(`and(sender_id.eq.${u.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${u.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              return {
                id: u.id,
                nickname: u.nickname || '사용자',
                user_type: u.user_type,
                unread_count: count || 0,
                last_message: lastMsg?.message,
                last_message_time: lastMsg?.created_at
              };
            })
          );

          setChatPartners(partnersWithUnread);
        }
      }
    } catch (error) {
      console.error('Error fetching chat partners:', error);
    }
  }, [user, isCoach, isAdmin]);

  // Fetch messages between user and partner
  const fetchMessages = useCallback(async () => {
    if (!user || !partnerId) return;

    setLoading(true);
    try {
      let query;
      
      if (isAdmin) {
        // Admin can view all messages with this partner
        query = supabase
          .from('chat_messages')
          .select('*')
          .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
          .order('created_at', { ascending: true });
      } else {
        // Regular user/coach: only their conversation
        query = supabase
          .from('chat_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get sender nicknames
      const senderIds = [...new Set((data || []).map(m => m.sender_id))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', senderIds);

      const nicknameMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);

      setMessages((data || []).map(m => ({
        ...m,
        sender_nickname: nicknameMap.get(m.sender_id) || '사용자'
      })));

      // Mark messages as read
      if (!isAdmin) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('sender_id', partnerId)
          .eq('receiver_id', user.id)
          .eq('is_read', false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: '오류',
        description: '메시지를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, partnerId, isAdmin, toast]);

  // Send a message
  const sendMessage = async (message: string) => {
    if (!user || !partnerId || !message.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: partnerId,
        message: message.trim(),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '오류',
        description: '메시지 전송에 실패했습니다.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  // Get assigned coach info for user
  const getAssignedCoach = useCallback(async () => {
    if (!profile?.assigned_coach_id) return null;

    const { data } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', profile.assigned_coach_id)
      .single();

    return data;
  }, [profile?.assigned_coach_id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !partnerId) return;

    const channelName = `chat-${[user.id, partnerId].sort().join('-')}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Only add if relevant to this conversation
          const isRelevant = 
            (newMessage.sender_id === user.id && newMessage.receiver_id === partnerId) ||
            (newMessage.sender_id === partnerId && newMessage.receiver_id === user.id) ||
            (isAdmin && (newMessage.sender_id === partnerId || newMessage.receiver_id === partnerId));

          if (isRelevant) {
            // Get sender nickname
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', newMessage.sender_id)
              .single();

            setMessages(prev => [...prev, {
              ...newMessage,
              sender_nickname: senderProfile?.nickname || '사용자'
            }]);

            // Mark as read if we're the receiver
            if (newMessage.receiver_id === user.id && !isAdmin) {
              await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', newMessage.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, partnerId, isAdmin]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchChatPartners();
  }, [fetchChatPartners]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    chatPartners,
    getAssignedCoach,
    refreshMessages: fetchMessages,
    refreshPartners: fetchChatPartners,
  };
}
