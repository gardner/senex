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
  REACTION_TIME_TASK,
  scoreReactionTimeSprint,
} from "@/lib/cognitive-tasks";
import {
  completeLocalSession,
  saveScore,
  saveTaskRun,
  saveTrialEvents,
  startLocalSession,
} from "@/lib/local";

const DEMO_SEED = "demo-reaction-seed";
const DEMO_RESPONSES = [
  300, 350, 390, 400, 405, 410, 410, 410, 410, 410, 415, 420, 430, 440, 450,
  470,
];

type SaveState = "idle" | "saving" | "saved" | "error";

export function CognitiveTaskPanel() {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const [medianRt, setMedianRt] = useState<number | null>(null);
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
      setState("saved");
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
          Start with Reaction Time Sprint; additional task definitions are ready
          for the full battery.
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
        {state === "saved" && (
          <div className="space-y-1">
            <p>Reaction Time Sprint saved locally.</p>
            <p>Median RT: {medianRt} ms</p>
          </div>
        )}
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="mt-4">
        <Button
          type="button"
          onClick={handleDemoRun}
          disabled={!isReady || state === "saving"}
        >
          Run demo reaction sprint
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
