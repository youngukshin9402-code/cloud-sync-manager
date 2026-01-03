import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageSquare, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatConversation {
  user_id: string;
  coach_id: string;
  user_nickname: string;
  coach_nickname: string;
  message_count: number;
  last_message: string;
  last_message_time: string;
}

interface ChatMessageItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  image_url: string | null;
  created_at: string;
  is_read: boolean;
  sender_nickname: string;
  is_coach: boolean;
}

export default function AdminChats() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Get all messages and group by conversation
      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allMessages) return;

      // Group by user-coach pairs
      const conversationMap = new Map<string, {
        user_id: string;
        coach_id: string;
        messages: typeof allMessages;
      }>();

      // Get user profiles to determine user vs coach
      const userIds = new Set<string>();
      allMessages.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, user_type, assigned_coach_id')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group messages by conversation
      allMessages.forEach(msg => {
        const senderProfile = profileMap.get(msg.sender_id);
        const receiverProfile = profileMap.get(msg.receiver_id);

        let userId: string, coachId: string;

        // Determine which is the user and which is the coach
        if (senderProfile?.user_type === 'coach' || senderProfile?.user_type === 'admin') {
          coachId = msg.sender_id;
          userId = msg.receiver_id;
        } else {
          userId = msg.sender_id;
          coachId = msg.receiver_id;
        }

        const key = `${userId}-${coachId}`;
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            user_id: userId,
            coach_id: coachId,
            messages: [],
          });
        }
        conversationMap.get(key)!.messages.push(msg);
      });

      // Convert to conversation list
      const convList: ChatConversation[] = Array.from(conversationMap.values()).map(conv => {
        const lastMsg = conv.messages[0];
        const userProfile = profileMap.get(conv.user_id);
        const coachProfile = profileMap.get(conv.coach_id);

        return {
          user_id: conv.user_id,
          coach_id: conv.coach_id,
          user_nickname: userProfile?.nickname || '사용자',
          coach_nickname: coachProfile?.nickname || '코치',
          message_count: conv.messages.length,
          last_message: lastMsg.message,
          last_message_time: lastMsg.created_at,
        };
      });

      // Sort by last message time
      convList.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      setConversations(convList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 특정 대화의 메시지 조회
  const fetchConversationMessages = async (conv: ChatConversation) => {
    setLoadingMessages(true);
    try {
      // 해당 사용자-코치 간의 모든 메시지 조회
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${conv.user_id},receiver_id.eq.${conv.coach_id}),and(sender_id.eq.${conv.coach_id},receiver_id.eq.${conv.user_id})`)
        .order('created_at', { ascending: true });

      if (!messages) {
        setChatMessages([]);
        return;
      }

      // 프로필 조회
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, user_type')
        .in('id', [conv.user_id, conv.coach_id]);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const formattedMessages: ChatMessageItem[] = messages.map(msg => {
        const senderProfile = profileMap.get(msg.sender_id);
        const isCoach = senderProfile?.user_type === 'coach' || senderProfile?.user_type === 'admin';
        
        return {
          id: msg.id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          message: msg.message,
          message_type: msg.message_type,
          image_url: msg.image_url,
          created_at: msg.created_at,
          is_read: msg.is_read || false,
          sender_nickname: senderProfile?.nickname || '사용자',
          is_coach: isCoach,
        };
      });

      setChatMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleViewConversation = (conv: ChatConversation) => {
    setSelectedConversation(conv);
    fetchConversationMessages(conv);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user_nickname.toLowerCase().includes(search.toLowerCase()) ||
    conv.coach_nickname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">채팅 모니터링</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversations.length}</p>
                  <p className="text-xs text-muted-foreground">총 대화</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {conversations.reduce((acc, c) => acc + c.message_count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">총 메시지</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사용자 또는 코치 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Conversation List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">대화 목록</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? '검색 결과가 없습니다' : '채팅 기록이 없습니다'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={`${conv.user_id}-${conv.coach_id}`}
                      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleViewConversation(conv)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{conv.user_nickname}</span>
                            <span className="text-muted-foreground">↔</span>
                            <span className="font-medium">{conv.coach_nickname}</span>
                            <Badge variant="secondary" className="text-xs">
                              {conv.message_count}개
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(conv.last_message_time), 'yyyy.M.d a h:mm', { locale: ko })}
                          </p>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* View Conversation Dialog - 코치/사용자 정렬 구분 */}
      <Dialog open={!!selectedConversation} onOpenChange={() => {
        setSelectedConversation(null);
        setChatMessages([]);
      }}>
        <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="bg-sky-50 text-sky-700">사용자</Badge>
              {selectedConversation?.user_nickname}
              <span className="text-muted-foreground mx-1">↔</span>
              <Badge variant="outline" className="bg-primary/10 text-primary">코치</Badge>
              {selectedConversation?.coach_nickname}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">불러오는 중...</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">메시지가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      'flex w-full',
                      msg.is_coach ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      'flex flex-col max-w-[75%]',
                      msg.is_coach ? 'items-end' : 'items-start'
                    )}>
                      {/* 발신자 라벨 */}
                      <div className={cn(
                        'flex items-center gap-1 mb-1 px-1',
                        msg.is_coach ? 'flex-row-reverse' : ''
                      )}>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            msg.is_coach 
                              ? 'bg-primary/10 text-primary border-primary/20' 
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          )}
                        >
                          {msg.is_coach ? '코치' : '사용자'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.sender_nickname}
                        </span>
                      </div>

                      {/* 메시지 내용 */}
                      {msg.message_type === 'image' && msg.image_url ? (
                        <div className={cn(
                          'rounded-2xl overflow-hidden',
                          msg.is_coach ? 'rounded-br-md' : 'rounded-bl-md'
                        )}>
                          <img 
                            src={msg.image_url} 
                            alt="채팅 이미지" 
                            className="max-w-full max-h-48 object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          'px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap',
                          msg.is_coach
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        )}>
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                        </div>
                      )}
                      
                      {/* 시간 */}
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
