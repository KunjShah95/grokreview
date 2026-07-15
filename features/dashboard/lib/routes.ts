export const DASHBOARD_ROUTES = {
  overview: "/dashboard",
  repos: "/dashboard/repos",
  pullRequest: "/dashboard/pull-request",
  usage: "/dashboard/usage",
  analytics: "/dashboard/analytics",
  chat: "/dashboard/chat",
  codeHealth: "/dashboard/code-health",
  github: "/dashboard/github",
  webhooks: "/dashboard/webhooks",
  settings: "/dashboard/settings",
} as const;

export type DashboardRoute =
  (typeof DASHBOARD_ROUTES)[keyof typeof DASHBOARD_ROUTES];

export const DASHBOARD_NAV_ITEMS = [
  {
    title: "Overview",
    href: DASHBOARD_ROUTES.overview,
    icon: "layout-dashboard" as const,
  },
  {
    title: "Repositories",
    href: DASHBOARD_ROUTES.repos,
    icon: "folder-git-2" as const,
  },
  {
    title: "Pull Requests",
    href: DASHBOARD_ROUTES.pullRequest,
    icon: "folder-git-2" as const,
  },
  {
    title: "Usage",
    href: DASHBOARD_ROUTES.usage,
    icon: "chart-bar" as const,
  },
  {
    title: "Analytics",
    href: DASHBOARD_ROUTES.analytics,
    icon: "chart-line" as const,
  },
  {
    title: "Chat with Repo",
    href: DASHBOARD_ROUTES.chat,
    icon: "chat" as const,
  },
  {
    title: "Code Health",
    href: DASHBOARD_ROUTES.codeHealth,
    icon: "heartbeat" as const,
  },
  {
    title: "GitHub App",
    href: DASHBOARD_ROUTES.github,
    icon: "github" as const,
  },
  {
    title: "Webhooks",
    href: DASHBOARD_ROUTES.webhooks,
    icon: "webhooks" as const,
  },
  {
    title: "Settings",
    href: DASHBOARD_ROUTES.settings,
    icon: "settings" as const,
  },
] as const;
