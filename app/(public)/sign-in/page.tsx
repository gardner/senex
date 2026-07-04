import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { googleAuthEnabled } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth/helpers";

export const metadata = { title: "Sign in — Senex" };

export default async function SignInPage() {
  // Already signed in? Straight to the dashboard.
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <SignInForm googleEnabled={googleAuthEnabled} />
    </div>
  );
}
