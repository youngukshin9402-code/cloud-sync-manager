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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, MessageSquare, Send, RefreshCw } from "lucide-react";
import { useTicketsAdmin } from "@/hooks/useAdminHooks";

const STATUS_OPTIONS = [
  { value: 'open', label: '접수', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: '처리중', color: 'bg-amber-100 text-amber-700' },
  { value: 'resolved', label: '해결', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: '종료', color: 'bg-gray-100 text-gray-700' },
];

export default function AdminTickets() {
  const navigate = useNavigate();
  const { tickets, loading, updateStatus, addReply, refetch } = useTicketsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const getStatusBadge = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? (
      <Badge className={found.color}>{found.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const filteredTickets = tickets.filter(ticket => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

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

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {selectedTicket?.user_nickname} · {selectedTicket?.created_at && new Date(selectedTicket.created_at).toLocaleString('ko-KR')}
              </p>
              <p className="whitespace-pre-wrap">{selectedTicket?.message}</p>
            </div>

            {selectedTicket?.replies?.map((reply: any) => (
              <div 
                key={reply.id} 
                className={`rounded-lg p-4 ${reply.is_admin ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}
              >
                <p className="text-sm text-muted-foreground mb-1">
                  {reply.is_admin ? '관리자' : selectedTicket.user_nickname} · {new Date(reply.created_at).toLocaleString('ko-KR')}
                </p>
                <p className="whitespace-pre-wrap">{reply.message}</p>
              </div>
            ))}

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
    </div>
  );
}
