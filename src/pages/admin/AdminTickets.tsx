import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, MessageSquare, Send, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { useTicketsAdmin } from "@/hooks/useAdminHooks";

const STATUS_OPTIONS = [
  { value: 'open', label: '접수', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: '처리중', color: 'bg-amber-100 text-amber-700' },
  { value: 'resolved', label: '해결', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: '종료', color: 'bg-gray-100 text-gray-700' },
];

export default function AdminTickets() {
  const navigate = useNavigate();
  const { 
    tickets, 
    loading, 
    updateStatus, 
    addReply, 
    updateTicketMessage,
    deleteTicket,
    updateReply,
    deleteReply,
    refetch 
  } = useTicketsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  
  // 수정/삭제 관련 state
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [deleteTargetType, setDeleteTargetType] = useState<'ticket' | 'reply' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? (
      <Badge className={found.color}>{found.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  // 삭제된 티켓 제외
  const filteredTickets = tickets
    .filter(ticket => !ticket.is_deleted)
    .filter(ticket => {
      const matchesSearch = 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    await addReply(selectedTicket.id, replyMessage.trim());
    setReplyMessage("");
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    await updateStatus(ticketId, newStatus);
  };

  const handleEditTicket = (ticket: any) => {
    setEditingTicketId(ticket.id);
    setEditMessage(ticket.message);
  };

  const handleSaveTicketEdit = async () => {
    if (!editingTicketId || !editMessage.trim()) return;
    await updateTicketMessage(editingTicketId, editMessage.trim());
    setEditingTicketId(null);
    setEditMessage("");
    // 선택된 티켓도 업데이트
    if (selectedTicket?.id === editingTicketId) {
      setSelectedTicket({ ...selectedTicket, message: editMessage.trim() });
    }
  };

  const handleEditReply = (reply: any) => {
    setEditingReplyId(reply.id);
    setEditMessage(reply.message);
  };

  const handleSaveReplyEdit = async () => {
    if (!editingReplyId || !editMessage.trim()) return;
    await updateReply(editingReplyId, editMessage.trim());
    setEditingReplyId(null);
    setEditMessage("");
  };

  const confirmDelete = async () => {
    if (deleteTargetType === 'ticket' && deleteTargetId) {
      await deleteTicket(deleteTargetId);
      if (selectedTicket?.id === deleteTargetId) {
        setShowDetailDialog(false);
        setSelectedTicket(null);
      }
    } else if (deleteTargetType === 'reply' && deleteTargetId) {
      await deleteReply(deleteTargetId);
    }
    setDeleteTargetType(null);
    setDeleteTargetId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // 삭제되지 않은 답글만 필터링
  const visibleReplies = selectedTicket?.replies?.filter((r: any) => !r.is_deleted) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">고객문의 관리</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="제목 또는 고객명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-4">총 {filteredTickets.length}건</p>

        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="bg-card rounded-2xl border border-border p-5 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setSelectedTicket(ticket);
                setShowDetailDialog(true);
              }}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{ticket.subject}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    고객: {ticket.user_nickname || '알 수 없음'}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ticket.message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleDateString('ko-KR')}
                  </p>
                  <Select 
                    value={ticket.status} 
                    onValueChange={(value) => handleStatusChange(ticket.id, value)}
                  >
                    <SelectTrigger className="w-28" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          {filteredTickets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              문의 내역이 없습니다
            </div>
          )}
        </div>
      </main>

      {/* 상세 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 원본 문의 */}
            <div className="bg-muted rounded-lg p-4 relative group">
              <p className="text-sm text-muted-foreground mb-1">
                {selectedTicket?.user_nickname} · {selectedTicket?.created_at && new Date(selectedTicket.created_at).toLocaleString('ko-KR')}
              </p>
              {editingTicketId === selectedTicket?.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTicketEdit}>저장</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTicketId(null)}>취소</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap pr-16">{selectedTicket?.message}</p>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTicket(selectedTicket);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetType('ticket');
                        setDeleteTargetId(selectedTicket?.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* 답글들 */}
            {visibleReplies.map((reply: any) => (
              <div 
                key={reply.id} 
                className={`rounded-lg p-4 relative group ${reply.is_admin || reply.sender_type === 'admin' ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}
              >
                <p className="text-sm text-muted-foreground mb-1">
                  {reply.is_admin || reply.sender_type === 'admin' ? '관리자' : selectedTicket.user_nickname} · {new Date(reply.created_at).toLocaleString('ko-KR')}
                  {reply.updated_at && reply.updated_at !== reply.created_at && (
                    <span className="text-xs ml-1">(수정됨)</span>
                  )}
                </p>
                {editingReplyId === reply.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveReplyEdit}>저장</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingReplyId(null)}>취소</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap pr-16">{reply.message}</p>
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReply(reply);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetType('reply');
                          setDeleteTargetId(reply.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* 답글 입력 */}
            <div className="flex gap-2">
              <Textarea 
                placeholder="답변을 입력하세요..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={2}
              />
              <Button size="icon" onClick={handleReply} disabled={!replyMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTargetType} onOpenChange={() => {
        setDeleteTargetType(null);
        setDeleteTargetId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetType === 'ticket' 
                ? '이 문의를 삭제하시겠습니까? 삭제된 문의는 목록에서 숨겨집니다.' 
                : '이 답글을 삭제하시겠습니까?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}