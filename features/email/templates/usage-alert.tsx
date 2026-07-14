import React from "react";

type UsageAlertTemplateProps = {
  userName: string;
  used: number;
  limit: number;
  percentage: number;
  threshold: 80 | 100;
  daysLeft: number;
  dashboardUrl: string;
};

export function UsageAlertEmail({
  userName,
  used,
  limit,
  percentage,
  threshold,
  daysLeft,
  dashboardUrl,
}: UsageAlertTemplateProps) {
  const isCritical = threshold === 100;

  return (
    <div
      style={{
        fontFamily: "'Inter', 'SF Pro', -apple-system, sans-serif",
        maxWidth: "520px",
        margin: "0 auto",
        padding: "32px 24px",
        backgroundColor: isCritical ? "#fff5f5" : "#ffffff",
        color: "#1a1a2e",
      }}
    >
      {/* Header badge */}
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          backgroundColor: isCritical ? "#fee2e2" : "#fef3c7",
          color: isCritical ? "#991b1b" : "#92400e",
          marginBottom: "16px",
        }}
      >
        {isCritical ? "🚫 Usage Limit Reached" : "⚠️ Approaching Usage Limit"}
      </div>

      {/* Greeting */}
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          margin: "0 0 8px",
          lineHeight: "1.3",
        }}
      >
        Hey {userName},
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: "15px",
          lineHeight: "1.6",
          color: "#4a4a6a",
          margin: "0 0 24px",
        }}
      >
        {isCritical
          ? `You've used all ${limit} free reviews this billing cycle. New reviews are paused until your plan resets or you upgrade.`
          : `You've used ${used} of ${limit} free reviews (${percentage}%). You'll hit the limit soon.`}
      </p>

      {/* Usage Card */}
      <div
        style={{
          borderRadius: "8px",
          border: `1px solid ${isCritical ? "#fecaca" : "#fde68a"}`,
          backgroundColor: isCritical ? "#fef2f2" : "#fffbeb",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Progress */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            Monthly Usage
          </span>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: isCritical ? "#dc2626" : "#d97706",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {used}/{limit}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: "8px",
            borderRadius: "99px",
            backgroundColor: isCritical ? "#fecaca" : "#fde68a",
            overflow: "hidden",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(percentage, 100)}%`,
              borderRadius: "99px",
              backgroundColor: isCritical ? "#dc2626" : "#f59e0b",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "#6b7280",
            margin: "8px 0 0",
            textAlign: "right",
          }}
        >
          {daysLeft} days remaining in billing cycle
        </p>
      </div>

      {/* CTA */}
      <a
        href={dashboardUrl}
        style={{
          display: "block",
          textAlign: "center",
          padding: "12px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#ffffff",
          backgroundColor: isCritical ? "#dc2626" : "#d97706",
          textDecoration: "none",
          marginBottom: "16px",
        }}
      >
        {isCritical ? "Upgrade to Pro →" : "View Usage Dashboard →"}
      </a>

      {/* Footer */}
      <p
        style={{
          fontSize: "12px",
          color: "#9ca3af",
          textAlign: "center",
          margin: "24px 0 0",
          lineHeight: "1.5",
        }}
      >
        You received this email because you use GrokReview.
        <br />
        GrokReview · AI-powered PR reviews
      </p>
    </div>
  );
}
