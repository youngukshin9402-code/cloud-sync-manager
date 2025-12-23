import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type HealthRecordStatus = "uploading" | "analyzing" | "pending_review" | "completed" | "rejected";

export interface HealthRecordItem {
  name: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "danger";
  description: string;
}

export interface ParsedHealthData {
  health_age: number | null;
  summary: string;
  items: HealthRecordItem[];
  health_tags: string[];
  recommendations: string[];
}

export interface HealthRecord {
  id: string;
  user_id: string;
  raw_image_urls: string[];
  status: HealthRecordStatus;
  parsed_data: ParsedHealthData | null;
  health_age: number | null;
  health_tags: string[] | null;
  coach_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  exam_date: string | null;
}

// 정렬 함수: exam_date 우선, 없으면 created_at 기준 내림차순
const sortRecords = (records: HealthRecord[]): HealthRecord[] => {
  return [...records].sort((a, b) => {
    const dateA = a.exam_date || a.created_at;
    const dateB = b.exam_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
};

// 중복 제거 함수
const dedupeRecords = (records: HealthRecord[]): HealthRecord[] => {
  const seen = new Set<string>();
  return records.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
};

export function useHealthRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<HealthRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all records for the user
  const fetchRecords = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("health_records")
        .select("*")
        .eq("user_id", user.id)
        .order("exam_date", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const typedRecords = (data || []).map((record) => ({
        ...record,
        status: record.status as HealthRecordStatus,
        parsed_data: record.parsed_data as unknown as ParsedHealthData | null,
      }));

      // 중복 제거 후 정렬
      const processedRecords = sortRecords(dedupeRecords(typedRecords));
      setRecords(processedRecords);
      
      // Set the most recent non-completed record as current, or the most recent completed one
      const activeRecord = processedRecords.find(
        (r) => r.status !== "completed"
      );
      setCurrentRecord(activeRecord || processedRecords[0] || null);
    } catch (error) {
      console.error("Error fetching health records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to realtime updates - 함수형 업데이트로 stale closure 방지
  useEffect(() => {
    if (!user) return;

    fetchRecords();

    const channel = supabase
      .channel("health-records-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "health_records",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Health record change:", payload);
          
          if (payload.eventType === "INSERT") {
            const newRecord = {
              ...payload.new,
              status: payload.new.status as HealthRecordStatus,
              parsed_data: payload.new.parsed_data as unknown as ParsedHealthData | null,
            } as HealthRecord;
            
            // 중복 방지: 이미 같은 id가 있으면 무시
            setRecords((prev) => {
              if (prev.some((r) => r.id === newRecord.id)) {
                return prev;
              }
              return sortRecords([newRecord, ...prev]);
            });
            setCurrentRecord((prev) => prev || newRecord);
          } else if (payload.eventType === "UPDATE") {
            const updatedRecord = {
              ...payload.new,
              status: payload.new.status as HealthRecordStatus,
              parsed_data: payload.new.parsed_data as unknown as ParsedHealthData | null,
            } as HealthRecord;
            
            // 업데이트 후 재정렬
            setRecords((prev) =>
              sortRecords(prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)))
            );
            // 함수형 업데이트로 stale closure 문제 해결
            setCurrentRecord((prev) => 
              prev?.id === updatedRecord.id ? updatedRecord : prev
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setRecords((prev) => prev.filter((r) => r.id !== deletedId));
            setCurrentRecord((prev) => 
              prev?.id === deletedId ? null : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRecords]);

  // Upload images and create a new health record
  const uploadHealthCheckup = async (files: File[], examDate?: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return null;
    }

    setIsUploading(true);

    try {
      const imageUrls: string[] = [];

      // Upload each file to storage
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("health-checkups")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("이미지 업로드에 실패했습니다.");
        }

        imageUrls.push(fileName);
      }

      // Create health record with exam_date
      const { data: record, error: insertError } = await supabase
        .from("health_records")
        .insert({
          user_id: user.id,
          raw_image_urls: imageUrls,
          status: "uploading",
          exam_date: examDate || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("기록 생성에 실패했습니다.");
      }

      // 즉시 로컬 상태에 새 레코드 추가 (optimistic update) - 중복 방지 포함
      const newRecord: HealthRecord = {
        ...record,
        status: record.status as HealthRecordStatus,
        parsed_data: null,
      };
      setRecords((prev) => {
        if (prev.some((r) => r.id === newRecord.id)) {
          return prev;
        }
        return sortRecords([newRecord, ...prev]);
      });
      setCurrentRecord(newRecord);

      toast.success("업로드 완료! AI가 분석을 시작합니다.");

      // Trigger AI analysis (비동기로 진행, 결과는 realtime으로 받음)
      supabase.functions.invoke(
        "analyze-health-checkup",
        {
          body: {
            recordId: record.id,
            imageUrls: imageUrls,
          },
        }
      ).then(({ data: fnData, error: fnError }) => {
        if (fnError) {
          console.error("Function error:", fnError);
          
          try {
            const errorBody = typeof fnError === 'object' && fnError.message ? JSON.parse(fnError.message) : null;
            if (errorBody?.error === "invalid_image") {
              toast.error("업로드하신 이미지가 건강검진 결과지가 아닙니다. 올바른 이미지를 업로드해주세요.", {
                duration: 5000
              });
            } else {
              toast.error("AI 분석 요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
          } catch {
            toast.error("AI 분석 요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
          }
        } else if (fnData && fnData.error === "invalid_image") {
          toast.error(fnData.message || "업로드하신 이미지가 건강검진 결과지가 아닙니다. 올바른 이미지를 업로드해주세요.", {
            duration: 5000
          });
        } else if (fnData?.success) {
          toast.success("AI 분석이 완료되었습니다!");
        }
      });

      return record;
    } catch (error) {
      console.error("Error uploading health checkup:", error);
      toast.error(
        error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다."
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete a health record - optimistic update 적용
  const deleteRecord = async (recordId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    // Optimistic update: 즉시 UI에서 제거
    const previousRecords = records;
    const previousCurrentRecord = currentRecord;
    
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    setCurrentRecord((prev) => {
      if (prev?.id === recordId) {
        // 삭제된 레코드가 현재 레코드면 다음 레코드로 이동
        const remaining = previousRecords.filter((r) => r.id !== recordId);
        return remaining[0] || null;
      }
      return prev;
    });

    try {
      // Find the record to get image URLs
      const record = previousRecords.find((r) => r.id === recordId);
      
      // Delete images from storage if exists
      if (record?.raw_image_urls && record.raw_image_urls.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("health-checkups")
          .remove(record.raw_image_urls);
        
        if (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      // Delete the record
      const { error } = await supabase
        .from("health_records")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      toast.success("기록이 삭제되었습니다.");
      return true;
    } catch (error) {
      console.error("Error deleting health record:", error);
      // 롤백
      setRecords(previousRecords);
      setCurrentRecord(previousCurrentRecord);
      toast.error("삭제 중 오류가 발생했습니다.");
      return false;
    }
  };

  // Update exam_date of a record - optimistic update + 재정렬
  const updateExamDate = async (recordId: string, examDate: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    // Optimistic update: 즉시 UI 반영 + 재정렬
    const previousRecords = records;
    const previousCurrentRecord = currentRecord;
    
    setRecords((prev) =>
      sortRecords(prev.map((r) => (r.id === recordId ? { ...r, exam_date: examDate } : r)))
    );
    setCurrentRecord((prev) => 
      prev?.id === recordId ? { ...prev, exam_date: examDate } : prev
    );

    try {
      const { error } = await supabase
        .from("health_records")
        .update({ exam_date: examDate })
        .eq("id", recordId);

      if (error) throw error;

      toast.success("검진일이 수정되었습니다.");
      return true;
    } catch (error) {
      console.error("Error updating exam date:", error);
      // 롤백
      setRecords(previousRecords);
      setCurrentRecord(previousCurrentRecord);
      toast.error("수정 중 오류가 발생했습니다.");
      return false;
    }
  };

  return {
    records,
    currentRecord,
    isLoading,
    isUploading,
    uploadHealthCheckup,
    deleteRecord,
    updateExamDate,
    fetchRecords,
    setCurrentRecord,
  };
}
