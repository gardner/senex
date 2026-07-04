"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type TrialContactState = {
  enabled: boolean;
  consentVersion: string;
  optedInAt: string | null;
  optedOutAt: string | null;
  lastReviewedAt: string | null;
  updatedAt: string | null;
};

type PanelMessage = {
  tone: "neutral" | "error";
  text: string;
} | null;

export function TrialContactPanel() {
  const [trialContact, setTrialContact] = useState<TrialContactState | null>(
    null,
  );
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PanelMessage>(null);

  useEffect(() => {
    let active = true;
    async function loadPreference() {
      try {
        const next = await readTrialContact();
        if (!active) return;
        setTrialContact(next);
        setChecked(next.enabled);
      } catch (error) {
        if (active) setMessage(formatError(error, "Trial contact failed."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPreference();
    return () => {
      active = false;
    };
  }, []);

  async function savePreference() {
    setSaving(true);
    setMessage(null);
    try {
      const next = await writeTrialContact(checked);
      setTrialContact(next);
      setChecked(next.enabled);
      setMessage({
        tone: "neutral",
        text: "Trial contact preference saved.",
      });
    } catch (error) {
      setMessage(formatError(error, "Trial contact preference failed."));
    } finally {
      setSaving(false);
    }
  }

  const changed = trialContact ? checked !== trialContact.enabled : false;
  const statusText = statusLabel({ loading, trialContact, message });

  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Trial contact is not study enrolment. It only lets approved research
        teams or coordinators contact you with information if you may be
        eligible.
      </p>
      <div className="border-input space-y-3 rounded-md border p-4">
        <p className="text-sm">{statusText}</p>
        <p className="text-muted-foreground text-sm">
          Anonymous Reporting users cannot be contacted for trials. Trial
          contact is separate from general research sharing and can be turned
          off at any time.
        </p>
        {trialContact && <TrialContactMetadata trialContact={trialContact} />}
      </div>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          disabled={loading || saving}
          onChange={(event) => {
            setChecked(event.target.checked);
            setMessage(null);
          }}
        />
        <span>
          I&apos;m open to being contacted about relevant research studies or
          clinical trials.
        </span>
      </label>
      {message && (
        <p className={message.tone === "error" ? "text-destructive" : ""}>
          {message.text}
        </p>
      )}
      <Button
        type="button"
        disabled={loading || saving || !changed}
        onClick={() => void savePreference()}
      >
        {saving ? "Saving trial contact..." : "Save trial contact preference"}
      </Button>
    </section>
  );
}

function TrialContactMetadata({
  trialContact,
}: {
  trialContact: TrialContactState;
}) {
  return (
    <dl className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
      <MetadataItem
        label="Consent version"
        value={trialContact.consentVersion}
      />
      <MetadataItem
        label="Last reviewed"
        value={formatDateTime(trialContact.lastReviewedAt)}
      />
      <MetadataItem
        label="Opted in"
        value={formatDateTime(trialContact.optedInAt)}
      />
      <MetadataItem
        label="Opted out"
        value={formatDateTime(trialContact.optedOutAt)}
      />
    </dl>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

async function readTrialContact() {
  const response = await fetch("/api/account/trial-contact");
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { trialContact: TrialContactState };
  return body.trialContact;
}

async function writeTrialContact(enabled: boolean) {
  const response = await fetch("/api/account/trial-contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { trialContact: TrialContactState };
  return body.trialContact;
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(body?.error ?? "Trial contact request failed.");
}

function formatError(error: unknown, fallback: string): PanelMessage {
  return {
    tone: "error",
    text: error instanceof Error ? error.message : fallback,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

function statusLabel({
  loading,
  trialContact,
  message,
}: {
  loading: boolean;
  trialContact: TrialContactState | null;
  message: PanelMessage;
}) {
  if (loading) return "Loading trial contact preference.";
  if (!trialContact && message?.tone === "error") {
    return "Trial contact preference is unavailable.";
  }
  return trialContact?.enabled
    ? "Trial contact is on."
    : "Trial contact is off.";
}
