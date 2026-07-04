import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { googleAuthEnabled } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth/helpers";

export const metadata = { title: "Sign up — Senex" };

export default async function SignUpPage() {
  // Already signed in? Straight to the dashboard.
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <SignUpForm googleEnabled={googleAuthEnabled} />
    </div>
  );
}
