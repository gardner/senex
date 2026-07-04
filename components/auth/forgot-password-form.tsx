"use client";

import { useState, type FormEvent, type MouseEvent } from "react";

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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitResetRequest();
  }

  function handleSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!event.currentTarget.form?.reportValidity()) return;
    void submitResetRequest();
  }

  async function submitResetRequest() {
    if (pending) return;
    setError(null);
    setPending(true);
    const { error: requestError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (requestError) {
      setError(requestError.message ?? "Something went wrong");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1">Check your email</CardTitle>
          <CardDescription>
            If an account exists for {email}, a reset link is on its way. The
            link expires in an hour.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1">Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
        <CardFooter className="mt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={pending}
            onClick={handleSubmitClick}
          >
            {pending ? "Sending..." : "Send reset link"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
