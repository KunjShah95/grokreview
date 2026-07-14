import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldDescription,
} from "@/components/ui/field";
import { GithubSignInForm } from "@/features/auth/components/github-sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to GrokReview with your GitHub account.",
};

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { callbackUrl } = await searchParams;

  return (
    <Card className="border-border shadow-[0_20px_50px_-30px_rgba(30,27,75,0.35)]">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">Sign in to GrokReview</CardTitle>
        <CardDescription>
          Connect GitHub to start reviewing pull requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldSet>
          <FieldGroup>
            <Field>
              <GithubSignInForm callbackUrl={callbackUrl} />
              <FieldDescription>
                We request only the permissions needed to identify your account
                and read the repositories you choose. Revoke access anytime from
                GitHub settings.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  );
};

export default SignInPage;
