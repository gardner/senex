"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type AccountDataControlsProps = {
  user: {
    email: string;
    role?: string | null;
  };
};

type ControlMessage = {
  tone: "neutral" | "error";
  text: string;
} | null;

export function AccountDataControls({ user }: AccountDataControlsProps) {
  const [exporting, setExporting] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [confirmedDeletion, setConfirmedDeletion] = useState(false);
  const [message, setMessage] = useState<ControlMessage>(null);

  async function exportAccountData() {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) throw await responseError(response);
      const blob = await response.blob();
      downloadBlob(blob, exportFileName(response));
      setMessage({ tone: "neutral", text: "Account export downloaded." });
    } catch (error) {
      setMessage(formatError(error, "Account export failed."));
    } finally {
      setExporting(false);
    }
  }

  async function requestDeletion() {
    setRequestingDeletion(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/deletion-requests", {
        method: "POST",
      });
      if (!response.ok) throw await responseError(response);
      const body = (await response.json()) as { status?: string };
      setConfirmedDeletion(false);
      setMessage({
        tone: "neutral",
        text:
          body.status === "existing"
            ? "Deletion request already pending."
            : "Deletion request received.",
      });
    } catch (error) {
      setMessage(formatError(error, "Deletion request failed."));
    } finally {
      setRequestingDeletion(false);
    }
  }

  return (
    <section className="border-input space-y-3 rounded-md border p-4">
      <div>
        <h2 className="font-medium">Account data controls</h2>
        <p className="text-muted-foreground text-sm">
          Export account-linked history and request account deletion review.
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
      <p className="text-muted-foreground text-sm">
        Already shared research submissions are handled through review or
        exclusion where feasible; local browser history must be deleted on this
        device.
      </p>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmedDeletion}
          disabled={requestingDeletion}
          onChange={(event) => setConfirmedDeletion(event.target.checked)}
        />
        <span>
          I understand this creates a deletion request for account-linked data,
          not an immediate removal of all research or local browser data.
        </span>
      </label>
      {message && (
        <p className={message.tone === "error" ? "text-destructive" : ""}>
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          onClick={() => void exportAccountData()}
        >
          {exporting ? "Preparing export..." : "Export account data"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!confirmedDeletion || requestingDeletion}
          onClick={() => void requestDeletion()}
        >
          {requestingDeletion
            ? "Requesting deletion..."
            : "Request account deletion"}
        </Button>
      </div>
    </section>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportFileName(response: Response) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  return match?.[1] ?? "senex-account-export.json";
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(body?.error ?? "Request failed.");
}

function formatError(error: unknown, fallback: string): ControlMessage {
  return {
    tone: "error",
    text: error instanceof Error ? error.message : fallback,
  };
}
