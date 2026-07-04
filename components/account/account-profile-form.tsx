"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

type AccountProfileFormProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
    role?: string | null;
  };
};

export function AccountProfileForm({ user }: AccountProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitProfile();
  }

  function handleSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!event.currentTarget.form?.reportValidity()) return;
    void submitProfile();
  }

  async function submitProfile() {
    if (pending) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }
    setPending(true);
    setMessage(null);
    setError(null);
    const trimmedImage = image.trim();
    const result = await authClient.updateUser({
      name: trimmedName,
      image: trimmedImage || null,
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Account profile update failed.");
      return;
    }
    setName(trimmedName);
    setMessage("Account profile saved.");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <form
        onSubmit={handleSubmit}
        className="border-input space-y-4 rounded-md border p-4"
      >
        <div>
          <h2 className="font-medium">Profile fields</h2>
          <p className="text-muted-foreground text-sm">
            These fields identify your signed-in account only.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-image">Profile image URL</Label>
          <Input
            id="profile-image"
            type="url"
            autoComplete="url"
            value={image}
            onChange={(event) => setImage(event.target.value)}
          />
        </div>
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={pending} onClick={handleSubmitClick}>
          {pending ? "Saving profile..." : "Save profile"}
        </Button>
      </form>

      <section className="border-input space-y-3 rounded-md border p-4">
        <div>
          <h2 className="font-medium">Account data controls</h2>
          <p className="text-muted-foreground text-sm">
            Account export and deletion apply to account-linked records once
            sync is enabled.
          </p>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium">Email</dt>
            <dd className="text-muted-foreground">{user.email}</dd>
          </div>
          <div>
            <dt className="font-medium">Role</dt>
            <dd className="text-muted-foreground">{user.role ?? "user"}</dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-sm">
          Account updates do not change research consent.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled>
            Export account data
          </Button>
          <Button type="button" variant="outline" disabled>
            Request account deletion
          </Button>
        </div>
      </section>
    </div>
  );
}
