export type WebhookEvent = {
  id: string;
  eventName: string;
  action: string | null;
  repoFullName: string | null;
  status: "received" | "processed" | "failed";
  statusCode: number;
  durationMs: number;
  payload: string;
  error: string | null;
  createdAt: string;
};
