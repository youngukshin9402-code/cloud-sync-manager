import { forwardRef } from "react";
import { HealthRecord, HealthRecordItem } from "@/hooks/useHealthRecords";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface HealthShareCardProps {
  record: HealthRecord;
  imageUrls?: string[];
  aiAnalysis?: {
    summary?: string;
    health_score?: number;
    score_reason?: string;
    key_issues?: string[];
    action_items?: string[];
    warnings?: string[];
    recommendations?: string[];
  } | null;
}

function StatusBadgeShare({ status }: { status: "normal" | "warning" | "danger" }) {
  const styles = {
    normal: { bg: "#dcfce7", color: "#15803d" },
    warning: { bg: "#fef3c7", color: "#b45309" },
    danger: { bg: "#fee2e2", color: "#dc2626" },
  };
  const labels = {
    normal: "정상",
    warning: "주의",
    danger: "관리 필요",
  };
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 500,
        backgroundColor: styles[status].bg,
        color: styles[status].color,
      }}
    >
      {labels[status]}
    </span>
  );
}

function HealthItemShare({ item }: { item: HealthRecordItem }) {
  const dotColors = {
    normal: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
  };
  const bgColors = {
    normal: "#f0fdf4",
    warning: "#fffbeb",
    danger: "#fef2f2",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderRadius: "10px",
        backgroundColor: bgColors[item.status],
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: dotColors[item.status],
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500, fontSize: "13px" }}>{item.name}</span>
        <span style={{ color: "#6b7280", marginLeft: "6px", fontSize: "13px" }}>
          {item.value} {item.unit}
        </span>
      </div>
      <StatusBadgeShare status={item.status} />
    </div>
  );
}

const HealthShareCard = forwardRef<HTMLDivElement, HealthShareCardProps>(
  ({ record, imageUrls, aiAnalysis }, ref) => {
    const parsedData = record.parsed_data;
    const healthAge = parsedData?.health_age || record.health_age;
    const normalItems = parsedData?.items?.filter((i) => i.status === "normal") || [];
    const warningItems = parsedData?.items?.filter((i) => i.status === "warning") || [];
    const dangerItems = parsedData?.items?.filter((i) => i.status === "danger") || [];

    // 이미지 저장시 danger 항목만 표시 (주의/정상 항목 제외)
    const allItems = dangerItems.slice(0, 5);

    // AI 분석 데이터 (aiAnalysis prop 또는 parsed_data에서 가져옴)
    const analysis = aiAnalysis || parsedData;
    const hasAiAnalysis = !!(analysis?.summary || parsedData?.items?.length);
    const hasCoachComment = !!record.coach_comment;
    const healthScore = (analysis as any)?.health_score || parsedData?.health_score;
    const scoreReason = (analysis as any)?.score_reason || parsedData?.score_reason;
    const keyIssues = (analysis as any)?.key_issues || parsedData?.key_issues;
    const actionItems = (analysis as any)?.action_items || parsedData?.action_items;

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "16px",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1f2937",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            paddingBottom: "10px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "18px" }}>🩺</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#059669" }}>
              건강양갱
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {record.exam_date
              ? format(new Date(record.exam_date), "yyyy.MM.dd", { locale: ko })
              : format(new Date(record.created_at), "yyyy.MM.dd", { locale: ko })}
          </span>
        </div>

        {/* 건강 점수 제거됨 */}

        {/* 건강 나이 (점수 없을 때만) */}
        {healthAge && !healthScore && (
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              backgroundColor: "#ecfdf5",
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            <p style={{ color: "#6b7280", marginBottom: "4px", fontSize: "12px" }}>건강 나이</p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: "#059669", margin: 0 }}>
              {healthAge}세
            </p>
          </div>
        )}

        {/* 건강검진 이미지 (작게 표시) */}
        {imageUrls && imageUrls.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <img
              src={imageUrls[0]}
              alt="건강검진 결과"
              style={{
                width: "100%",
                maxHeight: "120px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* AI 분석 요약 */}
        {hasAiAnalysis ? (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
            }}
          >
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", marginBottom: "6px" }}>
              🤖 AI 분석 요약
            </p>
            <p style={{ fontSize: "13px", color: "#1f2937", lineHeight: 1.5, margin: 0 }}>
              {analysis?.summary || "AI 분석이 완료되었습니다."}
            </p>
            
            {/* 핵심 문제 */}
            {keyIssues && keyIssues.length > 0 && (
              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #bae6fd" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#dc2626", marginBottom: "4px" }}>⚠️ 주의 항목</p>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  {keyIssues.slice(0, 3).map((issue: string, idx: number) => (
                    <li key={idx} style={{ fontSize: "11px", color: "#374151", marginBottom: "2px" }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 실천 항목 */}
            {actionItems && actionItems.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#059669", marginBottom: "4px" }}>✅ 오늘부터 실천</p>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  {actionItems.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} style={{ fontSize: "11px", color: "#374151", marginBottom: "2px" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #e5e5e5",
            }}
          >
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, textAlign: "center" }}>
              🤖 AI 분석 정보 없음
            </p>
          </div>
        )}

        {/* 코치 코멘트 */}
        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: hasCoachComment ? "#f0fdf4" : "#fafafa",
            border: hasCoachComment ? "1px solid #bbf7d0" : "1px solid #e5e5e5",
          }}
        >
          <p style={{ fontSize: "12px", fontWeight: 600, color: hasCoachComment ? "#059669" : "#9ca3af", marginBottom: "4px" }}>
            💬 코치 코멘트
          </p>
          <p style={{ fontSize: "12px", color: hasCoachComment ? "#1f2937" : "#9ca3af", margin: 0, lineHeight: 1.4 }}>
            {record.coach_comment || "코치 코멘트: 없음"}
          </p>
        </div>

        {/* 주요 수치 (간략하게) */}
        {allItems.length > 0 && (
          <div style={{ marginBottom: "10px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>📋 주요 수치</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {allItems.map((item, idx) => (
                <HealthItemShare key={idx} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div
          style={{
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
            건강양갱 - AI 건강 관리 서비스
          </p>
        </div>
      </div>
    );
  }
);

HealthShareCard.displayName = "HealthShareCard";

export default HealthShareCard;