"use client";

import {
  ArrowRight,
  Check,
  GithubLogo,
  GitPullRequest,
  Cpu,
} from "@phosphor-icons/react";

type SetupChecklistProps = {
  githubConnected: boolean;
  hasReviews: boolean;
  completedSteps: number;
  totalSteps: number;
  installUrl: string;
};

type StepState = "done" | "current" | "upcoming";

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3.5" weight="bold" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
        <span className="size-2 rounded-full bg-primary" />
      </span>
    );
  }
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

function stepState(
  index: number,
  completedSteps: number
): StepState {
  if (index < completedSteps) return "done";
  if (index === completedSteps) return "current";
  return "upcoming";
}

export function SetupChecklist({
  githubConnected,
  hasReviews,
  completedSteps,
  totalSteps,
  installUrl,
}: SetupChecklistProps) {
  const steps = [
    {
      icon: GithubLogo,
      title: "Install GitHub App",
      description: "Connect GrokReview to your repositories.",
      action: githubConnected
        ? { label: "Connected", href: "/dashboard/github" }
        : { label: "Install", href: installUrl, external: true },
    },
    {
      icon: Cpu,
      title: "Configure AI Provider",
      description:
        "Set up an AI model to power your reviews. Try Groq (free) at console.groq.com.",
      action: { label: "Set up AI", href: "/dashboard/settings" },
    },
    {
      icon: GitPullRequest,
      title: "Review your first PR",
      description:
        "Open a pull request on any connected repo. The review appears here automatically.",
      action: hasReviews
        ? { label: "View reviews", href: "/dashboard/pull-request" }
        : { label: "Open a PR", href: "https://github.com", external: true },
    },
  ];

  const allDone = completedSteps >= totalSteps;

  if (allDone) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
          <GitPullRequest className="size-5" weight="bold" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Welcome to GrokReview</h2>
          <p className="text-xs text-muted-foreground">
            {completedSteps} of {totalSteps} setup steps completed
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="mt-6 space-y-0">
        {steps.map((step, i) => {
          const state = stepState(i, completedSteps);
          const isActionable = state === "current" || state === "done";

          return (
            <div key={step.title} className="flex gap-3">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <StepIcon state={state} />
                {i < steps.length - 1 && (
                  <div
                    className={`mt-1 w-px flex-1 ${
                      state === "done" ? "bg-primary/30" : "bg-border"
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className={`flex-1 pb-8 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        state === "upcoming"
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      <step.icon className="mr-1.5 inline size-4" weight="bold" />
                      {step.title}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${
                        state === "upcoming"
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>

                  {isActionable && (
                    <a
                      href={step.action.href}
                      {...(step.action.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:translate-y-px ${
                        state === "done"
                          ? "bg-primary/10 text-primary"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {step.action.label}
                      <ArrowRight className="size-3" weight="bold" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
