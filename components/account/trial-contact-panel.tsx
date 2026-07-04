"use client";

import { useEffect, useState } from "react";

import { TrialContactProfileFields } from "@/components/account/trial-contact-profile-fields";
import { Button } from "@/components/ui/button";
import {
  emptyTrialContactProfileInput,
  type TrialContactProfile,
  type TrialContactProfileInput,
} from "@/lib/trial-contact/schema";

type TrialContactState = {
  enabled: boolean;
  consentVersion: string;
  optedInAt: string | null;
  optedOutAt: string | null;
  lastReviewedAt: string | null;
  updatedAt: string | null;
  profile: TrialContactProfile;
};

type PanelMessage = {
  tone: "neutral" | "error";
  text: string;
};

export function TrialContactPanel() {
  const [trialContact, setTrialContact] = useState<TrialContactState | null>(
    null,
  );
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState(emptyTrialContactProfileInput);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>([]);

  useEffect(() => {
    let active = true;
    async function loadPreference() {
      try {
        const next = await readTrialContact();
        if (!active) return;
        setTrialContact(next);
        setChecked(next.enabled);
        setProfile(profileInput(next.profile));
      } catch (error) {
        if (active) {
          setMessages([formatError(error, "Trial contact failed.")]);
        }
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
    setMessages([]);
    try {
      const profileChanged = trialContact
        ? !sameProfile(profile, profileInput(trialContact.profile))
        : true;
      const next = await writeTrialContact({
        enabled: statusChanged ? checked : undefined,
        profile: profileChanged ? profile : undefined,
      });
      setTrialContact(next);
      setChecked(next.enabled);
      setProfile(profileInput(next.profile));
      setMessages([
        { tone: "neutral", text: "Trial contact preference saved." },
        ...(profileChanged
          ? [{ tone: "neutral" as const, text: "Trial contact profile saved." }]
          : []),
      ]);
    } catch (error) {
      setMessages([formatError(error, "Trial contact preference failed.")]);
    } finally {
      setSaving(false);
    }
  }

  async function clearProfile() {
    setSaving(true);
    setMessages([]);
    try {
      const next = await writeTrialContact({
        profile: emptyTrialContactProfileInput(),
      });
      setTrialContact(next);
      setChecked(next.enabled);
      setProfile(profileInput(next.profile));
      setMessages([
        { tone: "neutral", text: "Trial contact profile cleared." },
      ]);
    } catch (error) {
      setMessages([formatError(error, "Trial contact profile clear failed.")]);
    } finally {
      setSaving(false);
    }
  }

  const statusChanged = trialContact ? checked !== trialContact.enabled : false;
  const profileChanged = trialContact
    ? !sameProfile(profile, profileInput(trialContact.profile))
    : false;
  const changed = statusChanged || profileChanged;
  const statusText = statusLabel({
    loading,
    trialContact,
    hasError: messages.some((message) => message.tone === "error"),
  });

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
            setMessages([]);
          }}
        />
        <span>
          I&apos;m open to being contacted about relevant research studies or
          clinical trials.
        </span>
      </label>
      <TrialContactProfileFields
        profile={profile}
        disabled={loading || saving}
        onChange={(next) => {
          setProfile(next);
          setMessages([]);
        }}
      />
      {messages.map((message) => (
        <p
          key={message.text}
          className={message.tone === "error" ? "text-destructive" : ""}
        >
          {message.text}
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={loading || saving || !changed}
          onClick={() => void savePreference()}
        >
          {saving ? "Saving trial contact..." : "Save trial contact preference"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading || saving}
          onClick={() => void clearProfile()}
        >
          Clear trial contact profile
        </Button>
      </div>
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
      <MetadataItem
        label="Profile reviewed"
        value={formatDateTime(trialContact.profile.lastReviewedAt)}
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

async function writeTrialContact(input: {
  enabled?: boolean;
  profile?: TrialContactProfileInput;
}) {
  const response = await fetch("/api/account/trial-contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
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

function profileInput(profile: TrialContactProfile): TrialContactProfileInput {
  return {
    preferredContactMethod: profile.preferredContactMethod,
    countryRegion: profile.countryRegion,
    ageEligibility: profile.ageEligibility,
    broadHealthAnswers: profile.broadHealthAnswers,
    availabilityPreference: profile.availabilityPreference,
  };
}

function sameProfile(
  left: TrialContactProfileInput,
  right: TrialContactProfileInput,
) {
  return JSON.stringify(left) === JSON.stringify(right);
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
  hasError,
}: {
  loading: boolean;
  trialContact: TrialContactState | null;
  hasError: boolean;
}) {
  if (loading) return "Loading trial contact preference.";
  if (!trialContact && hasError)
    return "Trial contact preference is unavailable.";
  return trialContact?.enabled
    ? "Trial contact is on."
    : "Trial contact is off.";
}
