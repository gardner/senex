"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getOrCreateLocalProfile,
  readLocalStorageSummary,
  requestPersistentLocalStorage,
  type LocalStorageSummary,
} from "@/lib/local";

type RequestState =
  | "idle"
  | "checking"
  | "granted"
  | "not-granted"
  | "unsupported"
  | "error";

export function LocalStorageStatus() {
  const [summary, setSummary] = useState<LocalStorageSummary | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("checking");
  const [error, setError] = useState<string | null>(null);

  async function refreshSummary() {
    try {
      setError(null);
      const nextSummary = await readLocalStorageSummary();
      setSummary(nextSummary);
      setRequestState(nextSummary.storagePersisted ? "granted" : "idle");
    } catch (caught) {
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleCreateProfile() {
    try {
      setError(null);
      await getOrCreateLocalProfile();
      await refreshSummary();
    } catch (caught) {
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleRequestPersistence() {
    try {
      setError(null);
      const result = await requestPersistentLocalStorage();
      if (!result.supported) {
        setRequestState("unsupported");
      } else {
        setRequestState(result.persisted ? "granted" : "not-granted");
      }
      setSummary(await readLocalStorageSummary());
    } catch (caught) {
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void readLocalStorageSummary()
      .then((nextSummary) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setRequestState(nextSummary.storagePersisted ? "granted" : "idle");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setRequestState("error");
        setError(caught instanceof Error ? caught.message : String(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasHistory = summary?.hasLocalHistory ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Private local history</CardTitle>
        <CardDescription>
          Offline Mode saves test history in this browser before anything can be
          exported, reported, or synced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="font-medium">
          {summary
            ? hasHistory
              ? "Local history exists on this browser."
              : "No local history saved in this browser yet."
            : "Checking local storage..."}
        </p>
        <p className="text-muted-foreground">
          Clearing site data, changing browsers, or using another device can
          remove access to local history. Export backups will be added in the
          next epic.
        </p>
        {summary?.lastSavedAt && (
          <p className="text-muted-foreground">
            Last local save:{" "}
            <time dateTime={summary.lastSavedAt}>
              {new Date(summary.lastSavedAt).toLocaleString()}
            </time>
          </p>
        )}
        <PersistenceMessage state={requestState} />
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={handleCreateProfile}>
          Use privately on this device
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleRequestPersistence}
        >
          Request persistent storage
        </Button>
      </CardFooter>
    </Card>
  );
}

function PersistenceMessage({ state }: { state: RequestState }) {
  if (state === "checking") {
    return <p className="text-muted-foreground">Checking browser storage...</p>;
  }
  if (state === "granted") {
    return <p>Browser persistent storage is enabled for this site.</p>;
  }
  if (state === "not-granted") {
    return (
      <p>
        Browser persistent storage was not granted. Local history still works,
        but exports are the safer backup path once available.
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p>
        This browser does not expose persistent storage requests. Local history
        still works, but it remains browser-managed.
      </p>
    );
  }
  if (state === "error") {
    return <p className="text-destructive">Local storage check failed.</p>;
  }
  return (
    <p className="text-muted-foreground">
      You can ask the browser to reduce the chance of local storage eviction.
      Browser support and approval vary.
    </p>
  );
}
