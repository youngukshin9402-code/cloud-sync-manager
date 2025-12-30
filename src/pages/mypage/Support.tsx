import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, HelpCircle, MessageSquare, Send, Plus, Clock, CheckCircle, Loader2, Pencil, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const faqs = [
  {
    q: "프리미엄 서비스는 무엇인가요?",
    a: "프리미엄 서비스에 가입하시면 전문 의사, 트레이너, 영양사와의 1:1 코칭을 받으실 수 있습니다."
  },
  {
    q: "보호자 연결은 어떻게 하나요?",
    a: "마이페이지 > 보호자 연결에서 연결 코드를 생성하고, 가족에게 코드를 전달하면 됩니다."
  },
  {
    q: "식사 사진 분석은 정확한가요?",
    a: "AI 기반 분석으로 대략적인 칼로리와 영양 정보를 제공합니다. 정확한 수치가 필요하면 수동으로 수정하실 수 있습니다."
  },
  {
    q: "건강검진 분석 결과는 의료적 진단인가요?",
    a: "아니요, 건강검진 분석은 참고용 정보입니다. 정확한 진단은 반드시 의료 전문가와 상담하세요."
  },
  {
    q: "데이터는 어디에 저장되나요?",
    a: "개인 건강 데이터는 암호화되어 안전하게 저장됩니다. 자세한 내용은 개인정보 처리방침을 확인해주세요."
  },
];

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface ThreadMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_admin: boolean;
  sender_type: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default function SupportPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"faq" | "tickets" | "new">("faq");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", message: "" });
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // 수정/삭제 상태
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user, fetchTickets]);

  const fetchThreadMessages = useCallback(async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setThreadMessages(data as ThreadMessage[]);
    }
  }, []);

  // 실시간 구독
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`ticket-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_replies',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        () => {
          fetchThreadMessages(selectedTicket.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket, fetchThreadMessages]);

  const handleCreateTicket = async () => {
    if (!user || !newTicket.subject || !newTicket.message) {
      toast({ title: "제목과 내용을 입력해주세요", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: newTicket.subject,
      message: newTicket.message,
      status: "open",
    });

    if (error) {
      toast({ title: "문의 등록에 실패했습니다", variant: "destructive" });
    } else {
      toast({ title: "문의가 접수되었습니다" });
      setNewTicket({ subject: "", message: "" });
      setActiveTab("tickets");
      fetchTickets();
    }
    setSubmitting(false);
  };

  // 사용자 답글 추가 (support_ticket_replies 테이블 사용)
  const handleAddReply = async () => {
    if (!user || !selectedTicket || !newReply.trim()) return;

    setSubmitting(true);
    
    const { error } = await supabase
      .from("support_ticket_replies")
      .insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: newReply.trim(),
        is_admin: false,
        sender_type: 'user',
      });

    if (error) {
      console.error('Error adding reply:', error);
      toast({ title: "메시지 등록에 실패했습니다", variant: "destructive" });
    } else {
      setNewReply("");
      toast({ title: "메시지가 추가되었습니다" });
      fetchThreadMessages(selectedTicket.id);
      
      // 알림 생성 (관리자에게)
      await createNotificationForAdmin(selectedTicket.id, "새 문의 답글이 등록되었습니다");
    }
    setSubmitting(false);
  };

  // 관리자 알림 생성
  const createNotificationForAdmin = async (ticketId: string, message: string) => {
    // 관리자 역할을 가진 사용자들에게 알림 생성
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminUsers) {
      for (const admin of adminUsers) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          type: "support_reply",
          title: "새 문의 답글",
          message: message,
          related_id: ticketId,
          related_type: "support_ticket",
        });
      }
    }
  };

  // 메시지 수정
  const handleEditMessage = async (messageId: string) => {
    if (!user || !editingText.trim()) return;

    setSubmitting(true);

    // 1. 이전 내용을 히스토리에 저장
    const currentMessage = threadMessages.find(m => m.id === messageId);
    if (currentMessage) {
      await supabase.from("support_ticket_message_history").insert({
        message_id: messageId,
        previous_message: currentMessage.message,
        edited_by: user.id,
      });
    }

    // 2. 메시지 업데이트
    const { error } = await supabase
      .from("support_ticket_replies")
      .update({ 
        message: editingText.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) {
      toast({ title: "수정에 실패했습니다", variant: "destructive" });
    } else {
      toast({ title: "메시지가 수정되었습니다" });
      setEditingMessageId(null);
      setEditingText("");
      if (selectedTicket) {
        fetchThreadMessages(selectedTicket.id);
      }
    }
    setSubmitting(false);
  };

  // 메시지 삭제 (soft delete)
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    setSubmitting(true);

    const { error } = await supabase
      .from("support_ticket_replies")
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) {
      toast({ title: "삭제에 실패했습니다", variant: "destructive" });
    } else {
      toast({ title: "메시지가 삭제되었습니다" });
      setDeleteConfirmId(null);
      if (selectedTicket) {
        fetchThreadMessages(selectedTicket.id);
      }
    }
    setSubmitting(false);
  };

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchThreadMessages(ticket.id);
  };

  const startEditing = (message: ThreadMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.message);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
            <Clock className="w-3 h-3" /> 접수
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
            <Loader2 className="w-3 h-3" /> 처리중
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
            <CheckCircle className="w-3 h-3" /> 완료
          </span>
        );
      default:
        return null;
    }
  };

  // 티켓 상세 보기 (스레드 형태)
  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold flex-1 truncate">{selectedTicket.subject}</h1>
            {getStatusBadge(selectedTicket.status)}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 원본 문의 (수정 불가) */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">내 문의</span>
              <span className="text-xs text-muted-foreground">
                {new Date(selectedTicket.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
          </div>

          {/* 스레드 메시지 */}
          {threadMessages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl border p-4 ${
                msg.sender_type === 'admin' 
                  ? "bg-primary/5 border-primary/20 ml-4" 
                  : "bg-card border-border mr-4"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${msg.sender_type === 'admin' ? 'text-primary' : ''}`}>
                    {msg.sender_type === 'admin' ? '관리자 답변' : '내 추가 문의'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleDateString("ko-KR")}
                  </span>
                  {msg.updated_at !== msg.created_at && (
                    <span className="text-xs text-muted-foreground">(수정됨)</span>
                  )}
                </div>
                
                {/* 사용자 메시지만 수정/삭제 가능 */}
                {msg.sender_type === 'user' && !editingMessageId && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEditing(msg)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(msg.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 수정 모드 */}
              {editingMessageId === msg.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditMessage(msg.id)}
                      disabled={submitting || !editingText.trim()}
                    >
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.message}</p>
              )}
            </div>
          ))}

          {/* 새 답글 입력 */}
          {selectedTicket.status !== "closed" && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <Textarea
                placeholder="추가 문의 내용을 입력하세요"
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                rows={3}
              />
              <Button
                className="w-full"
                onClick={handleAddReply}
                disabled={submitting || !newReply.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                추가 문의 보내기
              </Button>
            </div>
          )}
        </div>

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                메시지 삭제
              </AlertDialogTitle>
              <AlertDialogDescription>
                이 메시지를 삭제하시겠습니까? 삭제된 메시지는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirmId && handleDeleteMessage(deleteConfirmId)}
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">고객센터</h1>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "faq" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("faq")}
        >
          자주 묻는 질문
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "tickets" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("tickets")}
        >
          내 문의
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "new" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("new")}
        >
          문의하기
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* FAQ */}
        {activeTab === "faq" && (
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-left flex items-center gap-2 min-w-0">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate text-sm">{faq.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-muted-foreground text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* 내 문의 목록 */}
        {activeTab === "tickets" && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">문의 내역이 없습니다</p>
                <Button className="mt-4" onClick={() => setActiveTab("new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 문의하기
                </Button>
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className="w-full text-left bg-card rounded-2xl border border-border p-4 hover:border-primary transition-colors"
                  onClick={() => openTicketDetail(ticket)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ticket.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(ticket.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 새 문의 작성 */}
        {activeTab === "new" && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              문의하기
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">제목</label>
                <Input
                  placeholder="문의 제목을 입력하세요"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">내용</label>
                <Textarea
                  placeholder="문의 내용을 자세히 작성해주세요"
                  rows={6}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleCreateTicket} disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "전송 중..." : "문의 보내기"}
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                문의 접수 후 영업일 기준 1~2일 내에 답변 드립니다.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                이메일: support@yanggaeng.kr
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}