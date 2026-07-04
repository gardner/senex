"use client";

import { useEffect, useState } from "react";

import { BaselineSetupForm } from "@/components/offline/baseline-setup-form";
import { OfflineDashboardView } from "@/components/offline/offline-dashboard-view";
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
  buildOfflineDashboardSummary,
  type OfflineDashboardSummary,
} from "@/lib/offline-dashboard";
import {
  deleteSenexLocalDatabase,
  getOrCreateLocalProfile,
  listLocalSessions,
  listScores,
  readLocalStorageSummary,
  requestPersistentLocalStorage,
  saveQuestionnaireAnswer,
  type LocalStorageSummary,
} from "@/lib/local";

const BASELINE_QUESTIONNAIRE_ID = "baseline_setup_v1";

type Status = "idle" | "working" | "error";

export function OfflineModePanel() {
  const [summary, setSummary] = useState<LocalStorageSummary | null>(null);
  const [dashboard, setDashboard] = useState<OfflineDashboardSummary>(() =>
    buildOfflineDashboardSummary({
      now: new Date().toISOString(),
      sessions: [],
      scores: [],
    }),
  );
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [sleep, setSleep] = useState("prefer_not_to_answer");
  const [stress, setStress] = useState("prefer_not_to_answer");
  const [distractions, setDistractions] = useState("prefer_not_to_answer");
  const [notes, setNotes] = useState("");

  async function refreshDashboard() {
    const snapshot = await readDashboardSnapshot();
    setSummary(snapshot.summary);
    setDashboard(snapshot.dashboard);
  }

  async function handlePrivateMode() {
    await withStatus(async () => {
      await getOrCreateLocalProfile();
      await refreshDashboard();
      setMessage("Private mode is ready on this browser.");
    });
  }

  async function handleSaveBaselineSetup() {
    await withStatus(async () => {
      const profile = await getOrCreateLocalProfile();
      const answeredAt = new Date().toISOString();
      await Promise.all([
        saveAnswer(profile.profileId, "sleep_last_night", sleep, answeredAt),
        saveAnswer(profile.profileId, "stress_today", stress, answeredAt),
        saveAnswer(
          profile.profileId,
          "distractions_today",
          distractions,
          answeredAt,
        ),
        saveAnswer(profile.profileId, "context_notes", notes, answeredAt),
      ]);
      await refreshDashboard();
      setMessage("Baseline setup saved locally.");
    });
  }

  async function handleDeleteLocalHistory() {
    if (!window.confirm("Delete local history from this browser?")) {
      setMessage("Delete cancelled.");
      return;
    }
    await withStatus(async () => {
      await deleteSenexLocalDatabase();
      await refreshDashboard();
      setMessage("Local history deleted.");
    });
  }

  async function handleRequestPersistence() {
    await withStatus(async () => {
      const result = await requestPersistentLocalStorage();
      await refreshDashboard();
      if (!result.supported) {
        setMessage("This browser does not expose persistent storage requests.");
      } else if (result.persisted) {
        setMessage("Browser persistent storage is enabled for this site.");
      } else {
        setMessage("Browser persistent storage was not granted.");
      }
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
    void readDashboardSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        setSummary(snapshot.summary);
        setDashboard(snapshot.dashboard);
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

  const hasLocalHistory = summary?.hasLocalHistory ?? false;
  const controlsDisabled = summary === null || status === "working";

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Choose how to use Senex</CardTitle>
        <CardDescription>
          Start privately on this device. Reporting and account sync stay off
          until you choose them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <ModeOption
            title="Private on this device"
            body="Stores test history in this browser only."
          />
          <ModeOption
            title="Anonymous reporting"
            body="Later: share selected data with explicit consent."
          />
          <ModeOption
            title="Signed-in sync"
            body="Later: use an account for multi-device history."
          />
        </div>

        <div className="space-y-2">
          <p className="font-medium">
            {summary
              ? hasLocalHistory
                ? "Local history exists on this browser."
                : "No local history yet."
              : "Checking local storage..."}
          </p>
          <p className="text-muted-foreground">
            Offline Mode does not upload test history. Browser storage can still
            be cleared by site-data settings or browser storage pressure, so a
            JSON backup is the safest copy.
          </p>
          {summary?.lastSavedAt && (
            <p className="text-muted-foreground">
              Last local save:{" "}
              <time dateTime={summary.lastSavedAt}>
                {new Date(summary.lastSavedAt).toLocaleString()}
              </time>
            </p>
          )}
        </div>

        <BaselineSetupForm
          sleep={sleep}
          stress={stress}
          distractions={distractions}
          notes={notes}
          disabled={controlsDisabled}
          onSleepChange={setSleep}
          onStressChange={setStress}
          onDistractionsChange={setDistractions}
          onNotesChange={setNotes}
          onSave={() => void handleSaveBaselineSetup()}
        />

        <OfflineDashboardView
          summary={dashboard}
          disabled={controlsDisabled}
          onRefresh={() => void refreshDashboard()}
        />

        {message && (
          <p
            className={
              status === "error" ? "text-destructive" : "text-muted-foreground"
            }
          >
            {message}
          </p>
        )}
      </CardContent>
      <CardFooter className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void handlePrivateMode()}
          disabled={controlsDisabled || hasLocalHistory}
        >
          Use privately on this device
        </Button>
        <a
          href="#json-backup"
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors"
        >
          Open JSON backup
        </a>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleRequestPersistence()}
          disabled={controlsDisabled}
        >
          Request persistent storage
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleDeleteLocalHistory()}
          disabled={controlsDisabled || !hasLocalHistory}
        >
          Delete local history
        </Button>
      </CardFooter>
    </Card>
  );
}

function ModeOption({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-input rounded-md border px-3 py-2">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground mt-1">{body}</p>
    </div>
  );
}

async function readDashboardSnapshot() {
  const [summary, sessions, scores] = await Promise.all([
    readLocalStorageSummary(),
    listLocalSessions(),
    listScores({}),
  ]);
  return {
    summary,
    dashboard: buildOfflineDashboardSummary({
      now: new Date().toISOString(),
      sessions,
      scores,
    }),
  };
}

function saveAnswer(
  profileId: string,
  questionId: string,
  answerValue: string,
  answeredAt: string,
) {
  return saveQuestionnaireAnswer({
    answerId: `${BASELINE_QUESTIONNAIRE_ID}_${profileId}_${questionId}`,
    profileId,
    sessionId: null,
    questionnaireId: BASELINE_QUESTIONNAIRE_ID,
    questionnaireVersion: "2026-07-04",
    questionId,
    questionVersion: "1",
    answerValue,
    answeredAt,
    answerStatus:
      answerValue === "prefer_not_to_answer" ? "prefer_not_to_say" : "answered",
    sourceScreen: "offline_baseline",
  });
}
