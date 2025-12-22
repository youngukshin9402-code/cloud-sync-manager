import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, FileText, RefreshCw, Check, X, Eye } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";
import { HealthRecordDetailSheet } from "@/components/health/HealthRecordDetailSheet";

const STATUS_OPTIONS = [
  { value: 'uploading', label: '업로드중', color: 'bg-gray-100 text-gray-700' },
  { value: 'analyzing', label: '분석중', color: 'bg-blue-100 text-blue-700' },
  { value: 'pending_review', label: '검토대기', color: 'bg-amber-100 text-amber-700' },
  { value: 'completed', label: '완료', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: '반려', color: 'bg-red-100 text-red-700' },
];

export default function AdminHealthRecords() {
  const navigate = useNavigate();
  const { pendingRecords, loading, approveHealthRecord, refreshData } = useAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");
  
  // 상세보기 Sheet
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? (
      <Badge className={found.color}>{found.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const filteredRecords = pendingRecords.filter(record => {
    const matchesSearch = 
      record.user?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (recordId: string) => {
    await approveHealthRecord(recordId, "completed");
  };

  const handleReject = async (recordId: string) => {
    await approveHealthRecord(recordId, "rejected");
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
          <h1 className="text-xl font-bold">건강검진 승인 관리</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={refreshData}>
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
              placeholder="사용자 이름 또는 ID 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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

        <p className="text-sm text-muted-foreground mb-4">총 {filteredRecords.length}건</p>

        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">건강검진 기록</span>
                    {getStatusBadge(record.status || 'uploading')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    사용자: {record.user?.nickname || '알 수 없음'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ID: {record.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    건강나이: {record.health_age || '-'}세
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(record.created_at || '').toLocaleDateString('ko-KR')}
                  </p>
                  {record.health_tags && record.health_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {record.health_tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRecord({
                        ...record,
                        raw_image_urls: record.raw_image_urls || [],
                      });
                      setShowDetailSheet(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    상세보기
                  </Button>
                  {record.status === 'pending_review' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(record.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(record.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        반려
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              검토 대기 중인 건강검진 기록이 없습니다
            </div>
          )}
        </div>
      </main>

      {/* 건강검진 상세보기 Sheet */}
      <HealthRecordDetailSheet
        record={selectedRecord}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        userNickname={selectedRecord?.user?.nickname}
      />
    </div>
  );
}