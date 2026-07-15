import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { requireAuth } from "@/features/auth/actions";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getSyncedRepos } from "@/features/repo-sync/server/repo-sync";
import { ChatRepoPicker } from "@/features/chat/components/chat-repo-picker";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Chat with Repository · Dashboard",
};

export default async function DashboardChatPage() {
  const session = await requireAuth();
  const installationId = await getUserInstallationId(session.user.id);
  const repos = installationId ? await getSyncedRepos(installationId) : [];

  return (
    <>
      <DashboardHeader
        title="Chat with Repository"
        description="Ask questions about your codebase — answers are grounded in your synced repo with source citations."
      />

      {repos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No synced repositories yet. Sync a repo from the Repositories page to enable
            RAG-powered chat over its codebase.
          </p>
          <Link href={DASHBOARD_ROUTES.repos}>
            <Button variant="outline" size="sm">
              Go to Repositories
            </Button>
          </Link>
        </div>
      ) : (
        <ChatRepoPicker
          repos={repos.map((r) => ({ repoFullName: r.repoFullName, chunkCount: r.chunkCount }))}
        />
      )}
    </>
  );
}
