import { forwardRef } from "react";
import { HealthRecord, HealthRecordItem } from "@/hooks/useHealthRecords";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface HealthShareCardProps {
  record: HealthRecord;
  imageUrls?: string[];
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
  ({ record, imageUrls }, ref) => {
    const parsedData = record.parsed_data;
    const healthAge = record.health_age;
    const normalItems = parsedData?.items.filter((i) => i.status === "normal") || [];
    const warningItems = parsedData?.items.filter((i) => i.status === "warning") || [];
    const dangerItems = parsedData?.items.filter((i) => i.status === "danger") || [];

    // 최대 8개 항목만 표시 (중요도: danger > warning > normal)
    const allItems = [...dangerItems, ...warningItems, ...normalItems].slice(0, 8);

    return (
      <div
        ref={ref}
        style={{
          width: "400px",
          padding: "24px",
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
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px" }}>🩺</span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#059669" }}>
              건강양갱
            </span>
          </div>
          <span style={{ fontSize: "14px", color: "#6b7280" }}>
            {record.exam_date
              ? format(new Date(record.exam_date), "yyyy.MM.dd", { locale: ko })
              : ""}
          </span>
        </div>

        {/* 건강검진 이미지 (있으면 표시) */}
        {imageUrls && imageUrls.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <img
              src={imageUrls[0]}
              alt="건강검진 결과"
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "12px",
              }}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* 코치 코멘트 */}
        <div
          style={{
            marginBottom: "16px",
            padding: "16px",
            borderRadius: "12px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#059669", marginBottom: "4px" }}>
            💬 코치 코멘트
          </p>
          <p style={{ fontSize: "14px", color: "#1f2937", margin: 0 }}>
            {record.coach_comment || "코치 코멘트: 없음"}
          </p>
        </div>

        {/* 건강 나이 */}
        {healthAge && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              backgroundColor: "#ecfdf5",
              borderRadius: "16px",
              marginBottom: "16px",
            }}
          >
            <p style={{ color: "#6b7280", marginBottom: "8px", fontSize: "14px" }}>건강 나이</p>
            <p style={{ fontSize: "40px", fontWeight: 700, color: "#059669", margin: 0 }}>
              {healthAge}세
            </p>
          </div>
        )}

        {/* AI 분석 요약 */}
        {parsedData?.summary && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>📊 AI 분석 요약</p>
            <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6, margin: 0 }}>
              {parsedData.summary}
            </p>
          </div>
        )}

        {/* 권장사항 */}
        {parsedData?.recommendations && parsedData.recommendations.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>💡 권장사항</p>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {parsedData.recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} style={{ fontSize: "13px", color: "#374151", marginBottom: "4px" }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 주요 수치 */}
        {allItems.length > 0 && (
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>📋 주요 수치</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {allItems.map((item, idx) => (
                <HealthItemShare key={idx} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
            건강양갱 - AI 건강 관리 서비스
          </p>
        </div>
      </div>
    );
  }
);

HealthShareCard.displayName = "HealthShareCard";

export default HealthShareCard;
