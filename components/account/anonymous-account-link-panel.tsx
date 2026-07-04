"use client";

import { useState } from "react";

import {
  createAnonymousAccountLinkConsentRecord,
  type getAnonymousAccountLinkState,
} from "@/lib/account-sync/anonymous-link";
import { saveConsentRecord } from "@/lib/local";

import { Button } from "../ui/button";

type LinkState = ReturnType<typeof getAnonymousAccountLinkState>;
type LinkMessage = { tone: "neutral" | "error"; text: string } | null;

export function AnonymousAccountLinkPanel({
  accountId,
  profileId,
  linkState,
  disabled,
  onSaved,
}: {
  accountId: string;
  profileId: string | null;
  linkState: LinkState;
  disabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<LinkMessage>(null);
  const controlsDisabled = disabled || pending || !profileId;
  const linked = linkState.granted;

  async function saveDecision(decision: "granted" | "denied") {
    if (!profileId) return;
    setPending(true);
    setMessage(null);
    try {
      await saveConsentRecord(
        createAnonymousAccountLinkConsentRecord({
          profileId,
          accountId,
          decision,
          decidedAt: new Date().toISOString(),
        }),
      );
      await onSaved();
      setConfirmed(false);
      setMessage({
        tone: "neutral",
        text:
          decision === "granted"
            ? "Anonymous history linked to this account."
            : "Anonymous history was not linked.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Anonymous history link decision could not be saved.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border-input space-y-3 rounded-md border p-4">
      <div>
        <h3 className="font-medium">Anonymous history linking</h3>
        <p className="text-muted-foreground text-sm">
          Linking connects this browser&apos;s anonymous reporting history to
          your signed-in account identity. Past anonymous reporting consent
          events stay in the history and will be copied with the account import.
        </p>
      </div>

      {linked ? (
        <p className="text-muted-foreground text-sm">
          Anonymous reporting history is explicitly linked for this account.
          Importing local history still requires the separate account import
          confirmation below.
        </p>
      ) : (
        <LinkDecisionControls
          confirmed={confirmed}
          disabled={controlsDisabled}
          pending={pending}
          latestDecision={linkState.latestDecision}
          onConfirmedChange={setConfirmed}
          onSaveDecision={saveDecision}
        />
      )}

      {message && (
        <p className={message.tone === "error" ? "text-destructive" : ""}>
          {message.text}
        </p>
      )}
    </section>
  );
}

function LinkDecisionControls({
  confirmed,
  disabled,
  pending,
  latestDecision,
  onConfirmedChange,
  onSaveDecision,
}: {
  confirmed: boolean;
  disabled: boolean;
  pending: boolean;
  latestDecision: LinkState["latestDecision"];
  onConfirmedChange: (value: boolean) => void;
  onSaveDecision: (decision: "granted" | "denied") => Promise<void>;
}) {
  return (
    <>
      {latestDecision === "denied" && (
        <p className="text-muted-foreground text-sm">
          The latest local decision declined linking. You can still use this
          signed-in account without importing anonymous reporting history.
        </p>
      )}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={disabled}
          onChange={(event) => onConfirmedChange(event.target.checked)}
        />
        <span>
          I understand this connects my anonymous reporting history and consent
          trail to this signed-in account identity.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={disabled || !confirmed}
          onClick={() => void onSaveDecision("granted")}
        >
          {pending ? "Saving decision..." : "Link anonymous history"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => void onSaveDecision("denied")}
        >
          Decline linking
        </Button>
      </div>
    </>
  );
}
