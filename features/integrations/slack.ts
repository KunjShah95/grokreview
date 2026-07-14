/**
 * Slack integration for sending review notifications.
 * Users configure a Slack webhook URL in settings.
 */

type SlackNotification = {
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  model: string;
  summary: string;
  author: string;
  status: "reviewed" | "failed";
};

/**
 * Send a review notification to a Slack webhook.
 * The webhook URL is stored as an environment variable by the user.
 */
export async function sendSlackNotification(
  webhookUrl: string,
  notification: SlackNotification
): Promise<{ ok: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    return { ok: false, error: "Invalid Slack webhook URL" };
  }

  const color = notification.status === "reviewed" ? "#22c55e" : "#ef4444";
  const emoji = notification.status === "reviewed" ? "✅" : "❌";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} AI Code Review: ${notification.repoFullName}#${notification.prNumber}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${notification.prUrl}|${notification.prTitle}>*`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Repository:*\n${notification.repoFullName}` },
        { type: "mrkdwn", text: `*Author:*\n${notification.author}` },
        { type: "mrkdwn", text: `*Model:*\n${notification.model}` },
        { type: "mrkdwn", text: `*Status:*\n${notification.status}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Summary:*\n${notification.summary.slice(0, 500)}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View on GitHub" },
          url: notification.prUrl,
          style: "primary",
        },
      ],
    },
  ];

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `AI Code Review: ${notification.repoFullName}#${notification.prNumber}`,
        attachments: [{ color, blocks }],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `Slack API error: ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send Slack notification",
    };
  }
}

/**
 * Discord-compatible webhook (uses same interface but different payload format).
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  notification: SlackNotification
): Promise<{ ok: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return { ok: false, error: "Invalid Discord webhook URL" };
  }

  const color = notification.status === "reviewed" ? 0x22c55e : 0xef4444;

  const embed = {
    title: `🤖 AI Review: ${notification.repoFullName}#${notification.prNumber}`,
    description: notification.prTitle,
    url: notification.prUrl,
    color,
    fields: [
      { name: "Repository", value: notification.repoFullName, inline: true },
      { name: "Author", value: notification.author, inline: true },
      { name: "Model", value: notification.model, inline: true },
      { name: "Status", value: notification.status, inline: true },
      { name: "Summary", value: notification.summary.slice(0, 1000) },
    ],
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      return { ok: false, error: `Discord API error: ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send Discord notification",
    };
  }
}
