import "better-auth";

declare module "better-auth" {
  interface User {
    plan?: string;
    razorpaySubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionRenewsAt?: Date | null;
  }
}
