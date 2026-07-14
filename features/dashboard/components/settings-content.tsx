"use client";

import { format } from "date-fns";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import type { UserSubscription } from "@/features/dashboard/lib/types";
import { PLAN_DETAILS } from "@/features/settings/lib/plan-details";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusBadge } from "../lib/status-style";
import { CancelSubscriptionButton } from "@/features/billing/components/cancel-subscription-button";
import { getDisplayName, getInitials } from "@/features/auth/components/user-menu";
import { ModelSettings } from "@/features/settings/components/model-settings";
import { PromptEditor } from "@/features/prompts/components/prompt-editor";
import type { SettingsProfile } from "@/features/settings/types";
import type { UsageSummary } from "@/features/billing/server/usage";
import { IntegrationSettings } from "@/features/integrations/components/integration-settings";

type SettingsContentProps = {
  profile: SettingsProfile;
  subscription: UserSubscription;
  usage: UsageSummary;
};

function formatRenewalDate(renewsAt: string | null): string | null {
  if (!renewsAt) return null;
  return format(new Date(renewsAt), "MMMM d, yyyy");
}

function getSubscriptionStatusLabel(status: UserSubscription["status"]): string {
  return status === "active" ? "active" : status === "trialing" ? "trialing" : "canceled";
}

function ProfileTab({ profile }: { profile: SettingsProfile }) {
  const displayName = getDisplayName(profile);
  const initials = getInitials(profile);
  const memberSince = format(new Date(profile.memberSince), "MMMM d, yyyy");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Account information from your GitHub sign-in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {profile.image ? <AvatarImage src={profile.image} alt={displayName} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" defaultValue={profile.name} readOnly />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={profile.email} readOnly />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Profile details are managed by GitHub. Update them in your GitHub account settings.
        </p>
      </CardFooter>
    </Card>
  );
}

function getUsageText(usage: UsageSummary): string {
  return usage.limit === null
    ? `${usage.used} reviews used this month (unlimited)`
    : `${usage.used} / ${usage.limit} reviews used this month`;
}

function SubscriptionTab({
  subscription,
  usage,
}: {
  subscription: UserSubscription;
  usage: UsageSummary;
}) {
  const planDetails = PLAN_DETAILS[subscription.plan];
  const renewalDate = formatRenewalDate(subscription.renewsAt);
  const statusLabel = getSubscriptionStatusLabel(subscription.status);
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  let cardBorderClass = "border-border";
  let planTextClass = "text-foreground";
  let badgeTone: "success" | "neutral" | "warning" = "neutral";

  if (isActive) {
    cardBorderClass = "border-green-500/25";
    planTextClass = "text-green-800 dark:text-green-300";
    badgeTone = "success";
  }
  if (subscription.status === "canceled") badgeTone = "warning";

  return (
    <Card className={cardBorderClass}>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your plan and billing for AI code reviews.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4",
          isActive ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/30"
        )}>
          <div>
            <p className={cn("font-medium", planTextClass)}>{planDetails.label} plan</p>
            <p className="text-xs text-muted-foreground">Status: <span className={cn("font-medium capitalize", isActive ? "text-green-700 dark:text-green-400" : "text-foreground")}>{statusLabel}</span></p>
            {renewalDate ? <p className="text-xs text-muted-foreground">Renews {renewalDate}</p> : null}
          </div>
          <span className={statusBadge(badgeTone)}>{planDetails.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{getUsageText(usage)}</p>
        <ul className="space-y-2 text-xs text-muted-foreground">
          {planDetails.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {subscription.plan === "free" ? <UpgradeButton /> : null}
        {subscription.plan === "pro" ? (
          <CancelSubscriptionButton disabled={subscription.status === "canceled"} />
        ) : null}
      </CardFooter>
    </Card>
  );
}

export function SettingsContent({ profile, subscription, usage }: SettingsContentProps) {
  return (
    <div className="flex flex-1 flex-col p-6">
      <Tabs defaultValue="profile" className="w-full max-w-3xl">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6 space-y-6">
          <ProfileTab profile={profile} />
        </TabsContent>
        <TabsContent value="models" className="mt-6 space-y-6">
          <ModelSettings />
        </TabsContent>
        <TabsContent value="prompts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Prompts</CardTitle>
              <CardDescription>
                Customize the AI review prompt for your repositories. Choose a template
                or write your own instructions for how code should be reviewed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptEditor repoFullName="default" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <IntegrationSettings />
        </TabsContent>
        <TabsContent value="subscription" className="mt-6 space-y-6">
          <SubscriptionTab subscription={subscription} usage={usage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
