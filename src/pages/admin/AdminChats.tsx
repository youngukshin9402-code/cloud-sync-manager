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
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ChatConversation {
  user_id: string;
  coach_id: string;
  user_nickname: string;
  coach_nickname: string;
  message_count: number;
  last_message: string;
  last_message_time: string;
}

export default function AdminChats() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const { messages, loading: loadingMessages } = useChat(viewingUserId || undefined);

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

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleViewConversation = (conv: ChatConversation) => {
    setSelectedConversation(conv);
    setViewingUserId(conv.user_id);
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
                      className="p-4 hover:bg-accent/50 transition-colors"
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewConversation(conv)}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          보기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* View Conversation Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => {
        setSelectedConversation(null);
        setViewingUserId(null);
      }}>
        <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle>
              {selectedConversation?.user_nickname} ↔ {selectedConversation?.coach_nickname}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              messages={messages}
              loading={loadingMessages}
              sending={false}
              onSendMessage={async () => false}
              partnerName={selectedConversation?.user_nickname || ''}
              readOnly={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
