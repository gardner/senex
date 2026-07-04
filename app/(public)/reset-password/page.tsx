import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Reset password — Senex" };

// Better Auth's emailed link redirects here with ?token=... after validating
// the request.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle as="h1">This reset link isn&apos;t valid</CardTitle>
            <CardDescription>
              The link is missing its token — it may have been cut short in your
              email client. Request a fresh one.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/forgot-password" className={buttonVariants()}>
              Request a new link
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <ResetPasswordForm token={token} />
    </div>
  );
}
