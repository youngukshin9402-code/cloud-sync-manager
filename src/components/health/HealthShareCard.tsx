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
        fontSize: "12px",
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
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        backgroundColor: bgColors[item.status],
      }}
    >
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: dotColors[item.status],
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500 }}>{item.name}</span>
        <span style={{ color: "#6b7280", marginLeft: "8px" }}>
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

    // 최대 6개 항목만 표시 (중요도: danger > warning > normal)
    const allItems = [...dangerItems, ...warningItems, ...normalItems].slice(0, 6);

    // AI 분석 데이터 (aiAnalysis prop 또는 parsed_data에서 가져옴)
    const analysis = aiAnalysis || parsedData;
    const hasAiAnalysis = !!(analysis?.summary || parsedData?.items?.length);
    const hasCoachComment = !!record.coach_comment;

    return (
      <div
        ref={ref}
        style={{
          width: "360px",
          maxWidth: "100%",
          padding: "20px",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1f2937",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🩺</span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#059669" }}>
              건강양갱
            </span>
          </div>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            {record.exam_date
              ? format(new Date(record.exam_date), "yyyy.MM.dd", { locale: ko })
              : format(new Date(record.created_at), "yyyy.MM.dd", { locale: ko })}
          </span>
        </div>

        {/* 건강검진 이미지 (있으면 작게 표시) */}
        {imageUrls && imageUrls.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <img
              src={imageUrls[0]}
              alt="건강검진 결과"
              style={{
                width: "100%",
                maxHeight: "150px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* 건강 나이/점수 */}
        {(healthAge || (analysis as any)?.health_score) && (
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              backgroundColor: "#ecfdf5",
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            {healthAge && (
              <>
                <p style={{ color: "#6b7280", marginBottom: "4px", fontSize: "13px" }}>건강 나이</p>
                <p style={{ fontSize: "32px", fontWeight: 700, color: "#059669", margin: 0 }}>
                  {healthAge}세
                </p>
              </>
            )}
            {(analysis as any)?.health_score && (
              <>
                <p style={{ color: "#6b7280", marginBottom: "4px", fontSize: "13px", marginTop: healthAge ? "8px" : 0 }}>건강 점수</p>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#059669", margin: 0 }}>
                  {(analysis as any).health_score}점
                </p>
              </>
            )}
          </div>
        )}

        {/* AI 분석 요약 */}
        {hasAiAnalysis ? (
          <div
            style={{
              marginBottom: "12px",
              padding: "14px",
              borderRadius: "10px",
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
            }}
          >
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0369a1", marginBottom: "6px" }}>
              🤖 AI 분석
            </p>
            <p style={{ fontSize: "13px", color: "#1f2937", lineHeight: 1.5, margin: 0 }}>
              {analysis?.summary || parsedData?.summary || "AI 분석이 완료되었습니다."}
            </p>
            
            {/* 핵심 문제 */}
            {(analysis as any)?.key_issues && (analysis as any).key_issues.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626", marginBottom: "4px" }}>⚠️ 주의 항목</p>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  {(analysis as any).key_issues.slice(0, 3).map((issue: string, idx: number) => (
                    <li key={idx} style={{ fontSize: "12px", color: "#374151", marginBottom: "2px" }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 실천 항목 */}
            {(analysis as any)?.action_items && (analysis as any).action_items.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#059669", marginBottom: "4px" }}>✅ 오늘부터 실천</p>
                <ul style={{ margin: 0, paddingLeft: "16px" }}>
                  {(analysis as any).action_items.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} style={{ fontSize: "12px", color: "#374151", marginBottom: "2px" }}>
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
              padding: "14px",
              borderRadius: "10px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #e5e5e5",
            }}
          >
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, textAlign: "center" }}>
              🤖 AI 분석 정보 없음
            </p>
          </div>
        )}

        {/* 코치 코멘트 */}
        <div
          style={{
            marginBottom: "12px",
            padding: "14px",
            borderRadius: "10px",
            backgroundColor: hasCoachComment ? "#f0fdf4" : "#fafafa",
            border: hasCoachComment ? "1px solid #bbf7d0" : "1px solid #e5e5e5",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 600, color: hasCoachComment ? "#059669" : "#9ca3af", marginBottom: "6px" }}>
            💬 코치 코멘트
          </p>
          <p style={{ fontSize: "13px", color: hasCoachComment ? "#1f2937" : "#9ca3af", margin: 0 }}>
            {record.coach_comment || "코치 코멘트가 아직 없습니다"}
          </p>
        </div>

        {/* 권장사항 */}
        {(parsedData?.recommendations && parsedData.recommendations.length > 0) && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>💡 권장사항</p>
            <ul style={{ margin: 0, paddingLeft: "16px" }}>
              {parsedData.recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} style={{ fontSize: "12px", color: "#374151", marginBottom: "3px" }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 주요 수치 */}
        {allItems.length > 0 && (
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>📋 주요 수치</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {allItems.map((item, idx) => (
                <HealthItemShare key={idx} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
            건강양갱 - AI 건강 관리 서비스
          </p>
        </div>
      </div>
    );
  }
);

HealthShareCard.displayName = "HealthShareCard";

export default HealthShareCard;
