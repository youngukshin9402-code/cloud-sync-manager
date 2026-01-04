import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  image_url: string | null;
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
  const nicknameCache = useRef<Map<string, string>>(new Map());

  // Helper to get nickname
  const getNickname = useCallback(async (userId: string): Promise<string> => {
    if (nicknameCache.current.has(userId)) {
      return nicknameCache.current.get(userId)!;
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .single();
    
    const nickname = data?.nickname || '사용자';
    nicknameCache.current.set(userId, nickname);
    return nickname;
  }, []);

  // Create signed URL for chat media
  const getSignedImageUrl = useCallback(async (path: string): Promise<string | null> => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(path, 3600);
      
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }, []);

  // Fetch chat partners for coach (assigned users) or for admin (all users with chats)
  const fetchChatPartners = useCallback(async () => {
    if (!user) return;

    try {
      if (isAdmin) {
        const { data: allMessages } = await supabase
          .from('chat_messages')
          .select('sender_id, receiver_id')
          .order('created_at', { ascending: false });

        if (allMessages) {
          const uniqueUserIds = new Set<string>();
          allMessages.forEach(msg => {
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
        const { data: assignedUsers } = await supabase
          .from('profiles')
          .select('id, nickname, user_type')
          .eq('assigned_coach_id', user.id);

        if (assignedUsers) {
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
                .maybeSingle();

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
    if (!user || !partnerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query;
      
      if (isAdmin) {
        query = supabase
          .from('chat_messages')
          .select('*')
          .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
          .order('created_at', { ascending: true });
      } else {
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
      
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', senderIds);

        profiles?.forEach(p => {
          nicknameCache.current.set(p.id, p.nickname || '사용자');
        });
      }

      // Resolve image URLs
      const messagesWithImages = await Promise.all(
        (data || []).map(async (m) => ({
          ...m,
          sender_nickname: nicknameCache.current.get(m.sender_id) || '사용자',
          image_url: m.image_url ? await getSignedImageUrl(m.image_url) : null,
        }))
      );

      setMessages(messagesWithImages);

      // Mark messages as read
      if (!isAdmin && data && data.length > 0) {
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
  }, [user, partnerId, isAdmin, toast, getSignedImageUrl]);

  // Send a text message
  const sendMessage = async (message: string) => {
    if (!user || !partnerId || !message.trim()) return false;

    setSending(true);
    try {
      const { data, error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: partnerId,
        message: message.trim(),
        message_type: 'text',
      }).select().single();

      if (error) throw error;
      
      // Optimistically add the message
      if (data) {
        const nickname = await getNickname(user.id);
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            ...data,
            sender_nickname: nickname
          }];
        });

        // 코치가 사용자에게 채팅을 보낼 때 알림 생성
        if (isCoach) {
          try {
            await supabase
              .from('notifications')
              .insert({
                user_id: partnerId,
                type: 'chat_message',
                title: '코치가 채팅을 보냈습니다',
                message: message.trim().length > 50 
                  ? message.trim().substring(0, 50) + '...' 
                  : message.trim(),
                related_type: 'chat',
                related_id: data.id,
              });
          } catch (notifError) {
            console.error('Failed to create chat notification:', notifError);
          }
        }
      }
      
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

  // Send an image message
  const sendImageMessage = async (file: File) => {
    if (!user || !partnerId) return false;

    setSending(true);
    try {
      // Upload to storage
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${timestamp}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file, { cacheControl: '3600' });

      if (uploadError) throw uploadError;

      // Insert message
      const { data, error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: partnerId,
        message: '[이미지]',
        message_type: 'image',
        image_url: path,
      }).select().single();

      if (error) throw error;
      
      // Get signed URL for display
      const signedUrl = await getSignedImageUrl(path);
      
      if (data) {
        const nickname = await getNickname(user.id);
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            ...data,
            sender_nickname: nickname,
            image_url: signedUrl,
          }];
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error sending image:', error);
      toast({
        title: '오류',
        description: '이미지 전송에 실패했습니다.',
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

    console.log('Setting up realtime subscription for chat:', user.id, partnerId);

    const channelName = `chat-realtime-${Date.now()}`;
    
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
          console.log('Received realtime message:', payload);
          const newMessage = payload.new as ChatMessage;
          
          // Only add if relevant to this conversation
          const isRelevant = 
            (newMessage.sender_id === user.id && newMessage.receiver_id === partnerId) ||
            (newMessage.sender_id === partnerId && newMessage.receiver_id === user.id) ||
            (isAdmin && (newMessage.sender_id === partnerId || newMessage.receiver_id === partnerId));

          if (isRelevant) {
            const nickname = await getNickname(newMessage.sender_id);
            const imageUrl = newMessage.image_url 
              ? await getSignedImageUrl(newMessage.image_url) 
              : null;

            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, {
                ...newMessage,
                sender_nickname: nickname,
                image_url: imageUrl,
              }];
            });

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(m => m.id === updatedMessage.id 
              ? { ...m, is_read: updatedMessage.is_read }
              : m
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, partnerId, isAdmin, getNickname, getSignedImageUrl]);

  // Initial fetch
  useEffect(() => {
    if (partnerId) {
      fetchMessages();
    } else {
      setLoading(false);
    }
  }, [fetchMessages, partnerId]);

  useEffect(() => {
    fetchChatPartners();
  }, [fetchChatPartners]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    sendImageMessage,
    chatPartners,
    getAssignedCoach,
    refreshMessages: fetchMessages,
    refreshPartners: fetchChatPartners,
  };
}