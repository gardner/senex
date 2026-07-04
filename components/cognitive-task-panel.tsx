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
  buildFullDemoBattery,
  REACTION_TIME_TASK,
  scoreReactionTimeSprint,
  type DemoTaskResult,
} from "@/lib/cognitive-tasks";
import {
  completeLocalSession,
  saveScore,
  saveTaskRun,
  saveTrialEvents,
  startLocalSession,
} from "@/lib/local";

import { ArrowFocusRunner } from "./cognitive-tasks/arrow-focus-runner";
import { persistDemoTaskResult } from "./cognitive-tasks/persist-demo-result";
import { SequenceTapRunner } from "./cognitive-tasks/sequence-tap-runner";
import { SymbolMatchRunner } from "./cognitive-tasks/symbol-match-runner";

const DEMO_SEED = "demo-reaction-seed";
const DEMO_RESPONSES = [
  300, 350, 390, 400, 405, 410, 410, 410, 410, 410, 415, 420, 430, 440, 450,
  470,
];

type SaveState = "idle" | "saving" | "saved" | "error";
type LastResult = "reaction" | "full_battery" | null;

export function CognitiveTaskPanel() {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const [lastResult, setLastResult] = useState<LastResult>(null);
  const [medianRt, setMedianRt] = useState<number | null>(null);
  const [batterySummary, setBatterySummary] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function handleDemoRun() {
    try {
      setState("saving");
      setError(null);
      const score = scoreReactionTimeSprint({
        seed: DEMO_SEED,
        responses: DEMO_RESPONSES,
      });
      const session = await startLocalSession({
        cadence: "daily",
        contextSnapshot: { demo: true },
      });
      const now = new Date().toISOString();
      const taskRun = await saveTaskRun({
        taskRunId: `task_run_${crypto.randomUUID()}`,
        sessionId: session.sessionId,
        taskId: REACTION_TIME_TASK.taskId,
        taskVersion: REACTION_TIME_TASK.taskVersion,
        stimulusPackId: "reaction_time_sprint_v1",
        stimulusSeed: DEMO_SEED,
        startedAt: now,
        completedAt: now,
        summaryScore: score.metrics,
        qualityFlags: score.qualityFlags,
      });
      await saveTrialEvents(
        DEMO_RESPONSES.map((rtMs, index) => ({
          trialEventId: `trial_${taskRun.taskRunId}_${index}`,
          taskRunId: taskRun.taskRunId,
          trialIndex: index,
          stimulus: { delayMs: 800 + index * 50 },
          expectedResponse: "any",
          actualResponse: rtMs === null ? null : "demo_response",
          correct: rtMs !== null,
          stimulusOnsetTime: index * 2000,
          responseTime: rtMs === null ? null : index * 2000 + rtMs,
          rtMs,
          eventFlags: [],
        })),
      );
      await saveScore({
        scoreId: `score_${taskRun.taskRunId}_median_rt_ms`,
        sessionId: session.sessionId,
        taskRunId: taskRun.taskRunId,
        domain: REACTION_TIME_TASK.domain,
        metricName: "median_rt_ms",
        rawValue: score.metrics.median_rt_ms,
        normalizedValue: null,
        confidence: score.confidence,
        qualityFlags: score.qualityFlags,
      });
      await completeLocalSession(session.sessionId, {
        completedAt: now,
        qualityFlags: score.qualityFlags,
      });
      setMedianRt(score.metrics.median_rt_ms);
      setBatterySummary([]);
      setLastResult("reaction");
      setState("saved");
      notifyLocalDataUpdated();
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleFullBatteryRun() {
    try {
      setState("saving");
      setError(null);
      const results = buildFullDemoBattery();
      for (const result of results) await persistDemoTaskResult(result);
      setBatterySummary(results.map(summaryLine));
      setMedianRt(null);
      setLastResult("full_battery");
      setState("saved");
      notifyLocalDataUpdated();
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Task battery</CardTitle>
        <CardDescription>
          Run the demo task slices locally; these scaffolds are not diagnostic
          instruments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <TaskBadge label="Reaction Time Sprint" />
          <TaskBadge label="Symbol Match" />
          <TaskBadge label="Arrow Focus" />
          <TaskBadge label="Sequence Tap" />
          <TaskBadge label="Pair Learning" />
          <TaskBadge label="Seven-Day Learning" />
        </div>
        <SymbolMatchRunner onSaved={notifyLocalDataUpdated} />
        <ArrowFocusRunner onSaved={notifyLocalDataUpdated} />
        <SequenceTapRunner onSaved={notifyLocalDataUpdated} />
        {state === "saved" && lastResult === "reaction" && (
          <div className="space-y-1">
            <p>Reaction Time Sprint saved locally.</p>
            <p>Median RT: {medianRt} ms</p>
          </div>
        )}
        {state === "saved" && lastResult === "full_battery" && (
          <div className="space-y-1">
            <p>Full task battery saved locally.</p>
            <ul className="list-disc space-y-1 pl-5">
              {batterySummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleDemoRun}
          disabled={!isReady || state === "saving"}
        >
          Run demo reaction sprint
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleFullBatteryRun()}
          disabled={!isReady || state === "saving"}
        >
          Run full demo battery
        </Button>
      </CardFooter>
    </Card>
  );
}

function TaskBadge({ label }: { label: string }) {
  return (
    <div className="border-input rounded-md border px-3 py-2 font-medium">
      {label}
    </div>
  );
}

function notifyLocalDataUpdated() {
  window.dispatchEvent(new Event("senex-local-data-updated"));
}

function summaryLine(result: DemoTaskResult) {
  const metrics = result.summaryScore;
  if (result.task.taskId === "symbol_match") {
    return `Symbol Match correct count: ${metrics.correct_count}`;
  }
  if (result.task.taskId === "arrow_focus") {
    return `Arrow Focus accuracy: ${metrics.accuracy}`;
  }
  if (result.task.taskId === "sequence_tap") {
    return `Sequence Tap span: ${metrics.span}`;
  }
  if (result.task.taskId === "pair_learning") {
    return `Pair Learning immediate accuracy: ${metrics.immediate_accuracy}`;
  }
  if (result.task.taskId === "seven_day_learning_week") {
    return `Seven-Day Learning retention: ${metrics.retention}`;
  }
  return `Reaction Time Sprint median RT: ${metrics.median_rt_ms} ms`;
}
