"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { getAnonymousAccountLinkState } from "@/lib/account-sync/anonymous-link";
import { readAllLocalRecords, readLocalStorageSummary } from "@/lib/local";
import type { ExportableLocalRecords } from "@/lib/local/export-schema";

import { AnonymousAccountLinkPanel } from "./anonymous-account-link-panel";
import {
  captureAccountSyncFailure,
  postSyncPayload,
} from "./account-sync-import";
import {
  AccountSyncRecordCounts,
  countAccountSyncRecords,
} from "./account-sync-record-counts";

type AccountSyncPanelProps = {
  accountId: string;
};

type SyncMessage = { tone: "neutral" | "error"; text: string } | null;

export function AccountSyncPanel({ accountId }: AccountSyncPanelProps) {
  const { records, loading, loadError, reload } = useLocalRecords();
  const counts = useMemo(() => countAccountSyncRecords(records), [records]);
  const hasLocalHistory = counts.sessions > 0;
  const hasAnonymousReportingHistory = containsAnonymousReporting(records);
  const sourceProfileId = sourceProfileIdFor(records);
  const anonymousLinkState = useMemo(
    () =>
      getAnonymousAccountLinkState({
        accountId,
        profileId: sourceProfileId ?? undefined,
        consentRecords: records?.consentRecords ?? [],
      }),
    [accountId, records?.consentRecords, sourceProfileId],
  );
  const sync = useAccountSyncImport({
    accountId,
    records,
    hasLocalHistory,
    anonymousLinkRequired:
      hasAnonymousReportingHistory && !anonymousLinkState.granted,
  });
  const displayedMessage = sync.message ?? loadError;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Account sync</h2>
        <p className="text-muted-foreground text-sm">
          Copy local test history into this signed-in account only after you
          confirm. The local copy stays on this device.
        </p>
      </div>

      <AccountSyncRecordCounts counts={counts} />

      <div className="border-input space-y-3 rounded-md border p-4">
        <h3 className="font-medium">Research sharing</h3>
        <p className="text-muted-foreground text-sm">
          Research sharing is managed separately. Importing local history into
          your account does not submit it for research or change research
          consent.
        </p>
        {hasAnonymousReportingHistory && (
          <p className="text-muted-foreground text-sm">
            Anonymous reporting history needs a separate account-linking
            confirmation before it can be connected to your signed-in identity.
          </p>
        )}
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled
            aria-label="Share synced history for research"
          />
          Share synced history for research
        </label>
      </div>

      {hasAnonymousReportingHistory && (
        <AnonymousAccountLinkPanel
          accountId={accountId}
          profileId={sourceProfileId}
          linkState={anonymousLinkState}
          disabled={loading || sync.pending}
          onSaved={reload}
        />
      )}

      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={sync.confirmed}
          disabled={sync.confirmationDisabled || loading}
          onChange={sync.handleConfirmChange}
        />
        <span>
          I understand this will copy my local history to my account and keep
          the local copy on this device.
        </span>
      </label>

      {displayedMessage && (
        <p className={messageClassName(displayedMessage)}>
          {displayedMessage.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!sync.canImport}
          onClick={sync.importHistory}
        >
          {sync.pending ? "Importing history..." : "Import local history"}
        </Button>
        <Button type="button" variant="outline" onClick={sync.cancelImport}>
          Cancel import
        </Button>
      </div>
    </section>
  );
}

function useAccountSyncImport(input: {
  accountId: string;
  records: ExportableLocalRecords | null;
  hasLocalHistory: boolean;
  anonymousLinkRequired: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<SyncMessage>(null);
  const confirmationDisabled =
    !input.hasLocalHistory || input.anonymousLinkRequired || pending;
  const canImport = !confirmationDisabled && confirmed;

  function handleConfirmChange(event: ChangeEvent<HTMLInputElement>) {
    setConfirmed(event.target.checked);
    setMessage(null);
  }

  function cancelImport() {
    setConfirmed(false);
    setMessage({ tone: "neutral", text: "Local history was not uploaded." });
  }

  async function importHistory() {
    if (!input.records || !canImport) return;
    setPending(true);
    setMessage(null);
    try {
      const body = await postSyncPayload(input.accountId, input.records);
      setConfirmed(false);
      setMessage({ tone: "neutral", text: syncSuccessMessage(body.status) });
    } catch (error) {
      captureAccountSyncFailure("submit", error, input.records);
      setMessage(formatSyncError(error));
    } finally {
      setPending(false);
    }
  }

  return {
    canImport,
    cancelImport,
    confirmationDisabled,
    confirmed,
    handleConfirmChange,
    importHistory,
    message,
    pending,
  };
}

function useLocalRecords() {
  const [records, setRecords] = useState<ExportableLocalRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<SyncMessage>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRecords(await loadLocalRecordSnapshot());
    } catch (error) {
      captureAccountSyncFailure("load", error, null);
      setLoadError(formatLoadError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadLocalRecords() {
      try {
        const nextRecords = await loadLocalRecordSnapshot();
        if (active) setRecords(nextRecords);
      } catch (error) {
        captureAccountSyncFailure("load", error, null);
        if (active) setLoadError(formatLoadError(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadLocalRecords();
    return () => {
      active = false;
    };
  }, []);

  return { records, loading, loadError, reload };
}

function containsAnonymousReporting(records: ExportableLocalRecords | null) {
  return Boolean(
    records?.profiles.some(
      (profile) => profile.mode === "anonymous_reporting",
    ) || records?.anonymousIdentities.length,
  );
}

function sourceProfileIdFor(records: ExportableLocalRecords | null) {
  return (
    records?.profiles[0]?.profileId ??
    records?.anonymousIdentities[0]?.profileId ??
    null
  );
}

async function loadLocalRecordSnapshot() {
  await readLocalStorageSummary();
  return readAllLocalRecords(true);
}

function formatLoadError(error: unknown): SyncMessage {
  return {
    tone: "error",
    text:
      error instanceof Error ? error.message : "Could not read local history.",
  };
}

function formatSyncError(error: unknown): SyncMessage {
  return {
    tone: "error",
    text: error instanceof Error ? error.message : "Account sync failed.",
  };
}

function messageClassName(message: NonNullable<SyncMessage>) {
  if (message.tone === "error") return "text-destructive text-sm";
  return "text-muted-foreground text-sm";
}

function syncSuccessMessage(status: string | undefined) {
  if (status === "duplicate") {
    return "Local history was already copied to account.";
  }
  return "Local history copied to account.";
}
