import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { saveInstallation } from "@/features/github/server/installation";
import { getServerSession } from "@/features/auth/actions";
import { redirect } from "next/navigation";

function buildSignInCallbackUrl(installationId: string | null): string {
  if (installationId) {
    return `/api/github/callback?installation_id=${installationId}`;
  }
  return DASHBOARD_ROUTES.github;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const state = searchParams.get("state");
  const session = await getServerSession();

  if (!session) {
    const callbackUrl = buildSignInCallbackUrl(installationId);
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (state && state !== session.user.id) {
    return Response.json(
      { error: "Invalid state parameter — installation may have been tampered with." },
      { status: 403 }
    );
  }

  if (installationId) {
    const parsedId = Number(installationId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return Response.json(
        { error: "Invalid installation_id" },
        { status: 400 }
      );
    }
    await saveInstallation(session.user.id, parsedId);
  }

  redirect(DASHBOARD_ROUTES.github);
}
