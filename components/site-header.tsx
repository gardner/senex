import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/helpers";

// AIDEV-NOTE: Server component — uses buttonVariants() classes on <Link>
// instead of <Button render={...}> so no client-component composition is
// needed here.
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          Senex
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={buttonVariants()}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "ghost" })}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants()}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
