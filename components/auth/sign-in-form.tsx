"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
import { authClient } from "@/lib/auth/client";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSignIn();
  }

  function handleSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!event.currentTarget.form?.reportValidity()) return;
    void submitSignIn();
  }

  async function submitSignIn() {
    if (pending || !isReady) return;
    setError(null);
    setPending(true);
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          router.push("/dashboard");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setPending(false);
        },
      },
    );
  }

  async function handleGoogle() {
    setError(null);
    await authClient.signIn.social(
      { provider: "google", callbackURL: "/dashboard" },
      { onError: (ctx) => setError(ctx.error.message) },
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1">Sign in</CardTitle>
        <CardDescription>Welcome back</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending || !isReady}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending || !isReady}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !isReady}
            onClick={handleSubmitClick}
          >
            {pending ? "Signing in..." : "Sign in"}
          </Button>
          {googleEnabled ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending || !isReady}
              onClick={handleGoogle}
            >
              Continue with Google
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full" disabled>
              Google sign-in (not configured yet)
            </Button>
          )}
          <p className="text-muted-foreground text-sm">
            No account?{" "}
            <Link href="/sign-up" className="underline underline-offset-4">
              Sign up
            </Link>
          </p>
          <p className="text-muted-foreground text-sm">
            <Link
              href="/forgot-password"
              className="underline underline-offset-4"
            >
              Forgot your password?
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
