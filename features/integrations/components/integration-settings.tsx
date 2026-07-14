"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "@phosphor-icons/react";

type IntegrationSettingsProps = {
  initialSlackUrl?: string;
  initialDiscordUrl?: string;
};

export function IntegrationSettings({
  initialSlackUrl = "",
  initialDiscordUrl = "",
}: IntegrationSettingsProps) {
  const [slackUrl, setSlackUrl] = useState(initialSlackUrl);
  const [discordUrl, setDiscordUrl] = useState(initialDiscordUrl);
  const [savingSlack, setSavingSlack] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [slackSaved, setSlackSaved] = useState(false);
  const [discordSaved, setDiscordSaved] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const saveSlack = async () => {
    setSavingSlack(true);
    // In production, save to database
    localStorage.setItem("grokreview-slack-webhook", slackUrl);
    setSlackSaved(true);
    setTimeout(() => setSlackSaved(false), 2000);
    setSavingSlack(false);
  };

  const saveDiscord = async () => {
    setSavingDiscord(true);
    localStorage.setItem("grokreview-discord-webhook", discordUrl);
    setDiscordSaved(true);
    setTimeout(() => setDiscordSaved(false), 2000);
    setSavingDiscord(false);
  };

  const testWebhook = async (url: string, type: "slack" | "discord") => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "slack"
            ? { text: "✅ GrokReview integration test — your webhook is working!" }
            : { content: "✅ GrokReview integration test — your webhook is working!" }
        ),
      });
      setTestResult(res.ok ? "success" : "error");
    } catch {
      setTestResult("error");
    }
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            Send review notifications to a Slack channel. Create an incoming webhook
            in your Slack workspace settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="slack-url">Slack Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="slack-url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => testWebhook(slackUrl, "slack")}
                disabled={!slackUrl}
              >
                Test
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={saveSlack}
              disabled={savingSlack || !slackUrl}
            >
              {savingSlack ? <Spinner className="size-3" /> : null}
              {slackSaved ? "Saved!" : "Save Webhook"}
            </Button>
            {testResult && (
              <span className={`text-xs flex items-center gap-1 ${
                testResult === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {testResult === "success" ? (
                  <><CheckCircle className="size-3" /> Connected</>
                ) : (
                  <><XCircle className="size-3" /> Connection failed</>
                )}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord Integration</CardTitle>
          <CardDescription>
            Send review notifications to a Discord channel. Configure an incoming
            webhook in your Discord server settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="discord-url">Discord Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="discord-url"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => testWebhook(discordUrl, "discord")}
                disabled={!discordUrl}
              >
                Test
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={saveDiscord}
              disabled={savingDiscord || !discordUrl}
            >
              {savingDiscord ? <Spinner className="size-3" /> : null}
              {discordSaved ? "Saved!" : "Save Webhook"}
            </Button>
            {testResult && (
              <span className={`text-xs flex items-center gap-1 ${
                testResult === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {testResult === "success" ? (
                  <><CheckCircle className="size-3" /> Connected</>
                ) : (
                  <><XCircle className="size-3" /> Connection failed</>
                )}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
