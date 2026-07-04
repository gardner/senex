"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
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

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitNewPassword();
  }

  function handleSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!event.currentTarget.form?.reportValidity()) return;
    void submitNewPassword();
  }

  async function submitNewPassword() {
    if (pending) return;
    setError(null);
    setPending(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (resetError) {
      setError(resetError.message ?? "Something went wrong");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1">Choose a new password</CardTitle>
        <CardDescription>
          Then sign in with it on the next screen.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {pending ? "Saving..." : "Set new password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
