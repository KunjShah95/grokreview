import { getResend } from "@/lib/resend";
import React from "react";
import { UsageAlertEmail } from "@/features/email/templates/usage-alert";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "GrokReview <noreply@grokreview.com>";

export type AlertType = "usage_80" | "usage_100";

type SendUsageAlertParams = {
  to: string;
  userName: string;
  used: number;
  limit: number;
  percentage: number;
  threshold: 80 | 100;
  daysLeft: number;
  dashboardUrl: string;
};

export async function sendUsageAlertEmail(params: SendUsageAlertParams) {
  const { to, ...templateProps } = params;

  const subject =
    params.threshold === 100
      ? "🚫 GrokReview — You've used all your free reviews"
      : `⚠️ GrokReview — ${params.percentage}% of monthly reviews used`;

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react: React.createElement(UsageAlertEmail, templateProps),
  });

  if (error) {
    console.error("[Usage Alert] Failed to send email:", error);
    return { success: false as const, error };
  }

  console.log("[Usage Alert] Email sent:", data?.id);
  return { success: true as const, id: data?.id };
}
