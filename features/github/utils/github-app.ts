import { App } from "octokit";

let githubApp: App | null = null;

function getRequiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in your .env file or Vercel project settings.`
    );
  }
  return val;
}

export function getGithubApp() {
  if (!githubApp) {
    const appId = getRequiredEnv("GITHUB_APP_ID");
    const privateKey = getRequiredEnv("GITHUB_APP_PRIVATE_KEY");
    const webhookSecret = getRequiredEnv("GITHUB_WEBHOOK_SECRET");

    githubApp = new App({
      appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      webhooks: { secret: webhookSecret },
    });
  }
  return githubApp;
}

export function getGithubInstallUrl(userId: string) {
  const slug = process.env.GITHUB_APP_SLUG || "grokreview";
  const url = new URL(`https://github.com/apps/${slug}/installations/new`);
  url.searchParams.set("state", userId);
  return url.toString();
}
