"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CONSENT_CATEGORIES,
  buildAnonymousReportingPayload,
  createAnonymousConsentRecord,
  createAnonymousIdentityRecord,
  createReportingUploadRecord,
  deriveActiveConsent,
  pauseAnonymousIdentityRecord,
  resetAnonymousIdentityRecord,
  stopAnonymousIdentityRecord,
  type AnonymousReportingPayload,
  type ConsentCategoryId,
} from "@/lib/anonymous-reporting";
import {
  getOrCreateLocalProfile,
  readAllLocalRecords,
  saveAnonymousIdentity,
  saveConsentRecord,
  saveReportingUpload,
  type AnonymousIdentityRecord,
  type ConsentRecord,
  type ReportingUploadRecord,
} from "@/lib/local";

import {
  checkedFromConsent,
  errorMessage,
  latestSubmittableUpload,
  readReportingSnapshot,
  selectedScope,
  selectIdentity,
  todayString,
  type ReportingSnapshot,
} from "./anonymous-reporting/panel-model";
import { AnonymousReportingPanelView } from "./anonymous-reporting/panel-view";
import type { ReportingScopeType } from "./anonymous-reporting/panel-controls";

type Status = "idle" | "working" | "error";
type CheckedCategories = Partial<Record<ConsentCategoryId, boolean>>;

export function AnonymousReportingPanel() {
  const [identity, setIdentity] = useState<AnonymousIdentityRecord | null>(
    null,
  );
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [uploads, setUploads] = useState<ReportingUploadRecord[]>([]);
  const [checked, setChecked] = useState<CheckedCategories>({});
  const [preview, setPreview] = useState<AnonymousReportingPayload | null>(
    null,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<ReportingScopeType>(
    "all_existing_history",
  );
  const [rangeStart, setRangeStart] = useState(todayString);
  const [rangeEnd, setRangeEnd] = useState(todayString);

  const activeConsent = useMemo(
    () => deriveActiveConsent(consents),
    [consents],
  );
  const controlsDisabled = status === "working";

  async function refresh() {
    applySnapshot(await readReportingSnapshot());
  }

  function applySnapshot(snapshot: ReportingSnapshot) {
    const nextConsent = deriveActiveConsent(snapshot.consents);
    setIdentity(selectIdentity(snapshot.identities));
    setConsents(snapshot.consents);
    setUploads(snapshot.uploads);
    setChecked(checkedFromConsent(nextConsent));
  }

  async function handleCreateIdentity() {
    await withStatus(async () => {
      const profile = await getOrCreateLocalProfile();
      const record = createAnonymousIdentityRecord({
        profileId: profile.profileId,
        createdAt: new Date().toISOString(),
      });
      await saveAnonymousIdentity(record);
      await refresh();
      setMessage("Anonymous study ID created.");
    });
  }

  async function handleSaveConsent() {
    await withStatus(async () => {
      const profile = await getOrCreateLocalProfile();
      const decidedAt = new Date().toISOString();
      await Promise.all(
        CONSENT_CATEGORIES.map((category) =>
          saveConsentRecord(
            createAnonymousConsentRecord({
              profileId: profile.profileId,
              category: category.id,
              decision: checked[category.id] ? "granted" : "denied",
              decidedAt,
              sourceScreen: "reporting_center",
            }),
          ),
        ),
      );
      await refresh();
      setPreview(null);
      setMessage("Consent saved locally.");
    });
  }

  async function handleBuildPayload() {
    await withStatus(async () => {
      if (!identity) throw new Error("Create an anonymous study ID first.");
      const records = await readAllLocalRecords(true);
      const payload = buildAnonymousReportingPayload({
        identity,
        consentRecords: consents.filter(
          (record) => record.profileId === identity.profileId,
        ),
        localData: records,
        scope: selectedScope(scopeType, rangeStart, rangeEnd),
        generatedAt: new Date().toISOString(),
      });
      setPreview(payload);
      setMessage("Reporting payload built locally.");
    });
  }

  async function handleQueueUpload() {
    await withStatus(async () => {
      if (!identity || !preview) {
        throw new Error("Build a reporting payload before queueing.");
      }
      const upload = createReportingUploadRecord({
        profileId: identity.profileId,
        payload: preview,
        queuedAt: new Date().toISOString(),
      });
      await saveReportingUpload(upload);
      await refresh();
      setMessage("Upload queued locally.");
    });
  }

  async function handleSubmitUpload() {
    await withStatus(async () => {
      const upload = latestSubmittableUpload(uploads);
      if (!upload) throw new Error("No queued reporting upload is available.");
      const submittedAt = new Date().toISOString();
      const submitting = {
        ...upload,
        status: "submitting" as const,
        submittedAt,
        lastError: null,
      };
      await saveReportingUpload(submitting);
      try {
        const response = await fetch("/api/reporting/anonymous/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(upload.payload),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(errorMessage(body));
        await saveReportingUpload({
          ...submitting,
          status: "succeeded",
          completedAt: new Date().toISOString(),
        });
        await refresh();
        setMessage("Upload submitted.");
      } catch (caught) {
        await saveReportingUpload({
          ...submitting,
          status: "failed",
          completedAt: new Date().toISOString(),
          lastError: caught instanceof Error ? caught.message : String(caught),
        });
        throw caught;
      }
    });
  }

  async function handleCopyStudyId() {
    await withStatus(async () => {
      if (!identity) throw new Error("Create an anonymous study ID first.");
      await navigator.clipboard.writeText(identity.anonymousStudyId);
      setMessage("Study ID copied.");
    });
  }

  async function handleResetIdentity() {
    if (
      !window.confirm(
        "Reset anonymous study ID? Future uploads will no longer connect to this reporting history.",
      )
    ) {
      setMessage("Reset cancelled.");
      return;
    }
    await withStatus(async () => {
      if (!identity) throw new Error("Create an anonymous study ID first.");
      const reset = resetAnonymousIdentityRecord(identity, {
        createdAt: new Date().toISOString(),
      });
      await Promise.all([
        saveAnonymousIdentity(reset.oldIdentity),
        saveAnonymousIdentity(reset.newIdentity),
      ]);
      await refresh();
      setPreview(null);
      setMessage("Anonymous study ID reset.");
    });
  }

  async function handleStop() {
    await withStatus(async () => {
      if (!identity) throw new Error("Create an anonymous study ID first.");
      const decidedAt = new Date().toISOString();
      await Promise.all([
        saveAnonymousIdentity(stopAnonymousIdentityRecord(identity, decidedAt)),
        ...CONSENT_CATEGORIES.map((category) =>
          saveConsentRecord(
            createAnonymousConsentRecord({
              profileId: identity.profileId,
              category: category.id,
              decision: "withdrawn",
              decidedAt,
              sourceScreen: "reporting_center",
            }),
          ),
        ),
      ]);
      await refresh();
      setPreview(null);
      setMessage("Future sharing stopped.");
    });
  }

  async function updateIdentity(nextStatus: "active" | "paused") {
    await withStatus(async () => {
      if (!identity) throw new Error("Create an anonymous study ID first.");
      const updated =
        nextStatus === "paused"
          ? pauseAnonymousIdentityRecord(identity, new Date().toISOString())
          : { ...identity, status: "active" as const, pausedAt: null };
      await saveAnonymousIdentity(updated);
      await refresh();
      setMessage(
        nextStatus === "paused" ? "Reporting paused." : "Reporting resumed.",
      );
    });
  }

  async function withStatus(action: () => Promise<void>) {
    try {
      setStatus("working");
      setMessage(null);
      await action();
      setStatus("idle");
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void readReportingSnapshot()
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(caught instanceof Error ? caught.message : String(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnonymousReportingPanelView
      identity={identity}
      activeConsent={activeConsent}
      uploads={uploads}
      checked={checked}
      preview={preview}
      status={status}
      message={message}
      scopeType={scopeType}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      controlsDisabled={controlsDisabled}
      onCheckedChange={(category, value) =>
        setChecked((current) => ({ ...current, [category]: value }))
      }
      onScopeTypeChange={setScopeType}
      onRangeStartChange={setRangeStart}
      onRangeEndChange={setRangeEnd}
      onCreateIdentity={() => void handleCreateIdentity()}
      onCopyStudyId={() => void handleCopyStudyId()}
      onResetIdentity={() => void handleResetIdentity()}
      onSaveConsent={() => void handleSaveConsent()}
      onBuildPayload={() => void handleBuildPayload()}
      onQueueUpload={() => void handleQueueUpload()}
      onSubmitUpload={() => void handleSubmitUpload()}
      onPause={() => void updateIdentity("paused")}
      onResume={() => void updateIdentity("active")}
      onStop={() => void handleStop()}
    />
  );
}
