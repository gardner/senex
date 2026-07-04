"use client";

import { useCallback, useEffect, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  ARROW_FOCUS_TASK,
  generateArrowFocusTrials,
  scoreArrowFocus,
  type ArrowDirection,
  type ArrowFocusTrial,
  type DemoTaskResult,
} from "@/lib/cognitive-tasks";

import { persistTaskResult } from "./persist-demo-result";
import { useTaskInterruptions } from "./use-task-interruptions";

const ARROW_FOCUS_SEED = "interactive-arrow-focus-v1";
const ARROW_FOCUS_TRIAL_COUNT = 8;

type Phase = "idle" | "running" | "saving" | "saved" | "error";
type InputMode = "keyboard" | "pointer" | "touch";
type ArrowResponse = {
  trialId: string;
  direction: ArrowDirection;
  rtMs: number;
  startedAt: number;
  responseTime: number;
  inputMode: InputMode;
};

export function ArrowFocusRunner({ onSaved }: { onSaved: () => void }) {
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [trials, setTrials] = useState<ArrowFocusTrial[]>([]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialStartedAt, setTrialStartedAt] = useState(0);
  const [responses, setResponses] = useState<ArrowResponse[]>([]);
  const [summary, setSummary] = useState<{
    accuracy: number;
    conflictCostMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { readInterruptionCodes, resetInterruptions } = useTaskInterruptions(
    phase === "running",
    ARROW_FOCUS_TASK.taskId,
  );

  const currentTrial = trials[trialIndex] ?? null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const persistResponses = useCallback(
    async (nextResponses: ArrowResponse[]) => {
      try {
        setPhase("saving");
        const score = scoreArrowFocus(trials, nextResponses);
        await persistTaskResult(
          buildArrowFocusResult(
            trials,
            nextResponses,
            score.metrics,
            readInterruptionCodes(),
          ),
          {
            contextSnapshot: {
              interactive: true,
            },
          },
        );
        setSummary({
          accuracy: score.metrics.accuracy,
          conflictCostMs: score.metrics.conflict_cost_ms,
        });
        setPhase("saved");
        onSaved();
      } catch (caught) {
        setPhase("error");
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [onSaved, readInterruptionCodes, trials],
  );

  const submitResponse = useCallback(
    (direction: ArrowDirection, inputMode: InputMode) => {
      if (phase !== "running" || !currentTrial) return;
      const now = performance.now();
      const nextResponses = [
        ...responses,
        {
          trialId: currentTrial.trialId,
          direction,
          rtMs: Math.max(0, Math.round(now - trialStartedAt)),
          startedAt: Math.round(trialStartedAt),
          responseTime: Math.round(now),
          inputMode,
        },
      ];
      if (trialIndex === trials.length - 1) {
        void persistResponses(nextResponses);
        return;
      }
      setResponses(nextResponses);
      setTrialIndex((current) => current + 1);
      setTrialStartedAt(performance.now());
    },
    [
      currentTrial,
      persistResponses,
      phase,
      responses,
      trialIndex,
      trialStartedAt,
      trials.length,
    ],
  );

  useEffect(() => {
    if (phase !== "running" || !currentTrial) return;
    const listener = (event: KeyboardEvent) => {
      const direction = directionForKey(event.key);
      if (!direction) return;
      event.preventDefault();
      submitResponse(direction, "keyboard");
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [currentTrial, phase, submitResponse]);

  function start() {
    resetInterruptions();
    setTrials(
      generateArrowFocusTrials(ARROW_FOCUS_SEED, ARROW_FOCUS_TRIAL_COUNT),
    );
    setResponses([]);
    setSummary(null);
    setError(null);
    setTrialIndex(0);
    setTrialStartedAt(performance.now());
    setPhase("running");
  }

  function handlePointerResponse(
    event: PointerEvent<HTMLButtonElement>,
    direction: ArrowDirection,
  ) {
    event.preventDefault();
    submitResponse(
      direction,
      event.pointerType === "touch" ? "touch" : "pointer",
    );
  }

  return (
    <section
      aria-label="Arrow Focus runner"
      className="border-input space-y-3 rounded-md border px-3 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Arrow Focus</h3>
          <p className="text-muted-foreground">
            Respond to the center arrow and ignore the surrounding arrows.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={!isReady || phase === "running" || phase === "saving"}
        >
          Start Arrow Focus
        </Button>
      </div>

      {phase === "running" && currentTrial && (
        <div className="space-y-3">
          <p>
            Arrow Focus trial {trialIndex + 1} of {trials.length}
          </p>
          <div
            aria-label={`Center arrow points ${currentTrial.targetDirection}`}
            className="rounded-md bg-muted px-3 py-4 text-center font-mono text-3xl tracking-normal"
            data-testid="arrow-focus-target-direction"
            data-direction={currentTrial.targetDirection}
          >
            {arrowStimulus(currentTrial)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label="Choose left"
              onPointerDown={(event) => handlePointerResponse(event, "left")}
            >
              Left
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Choose right"
              onPointerDown={(event) => handlePointerResponse(event, "right")}
            >
              Right
            </Button>
          </div>
        </div>
      )}

      {phase === "saved" && summary && (
        <div className="space-y-1">
          <p>Arrow Focus saved locally.</p>
          <p>Arrow Focus accuracy: {Math.round(summary.accuracy * 100)}%</p>
          <p>Conflict cost: {Math.round(summary.conflictCostMs)} ms</p>
        </div>
      )}
      {phase === "error" && error && (
        <p className="text-destructive">{error}</p>
      )}
    </section>
  );
}

function buildArrowFocusResult(
  trials: ArrowFocusTrial[],
  responses: ArrowResponse[],
  metrics: ReturnType<typeof scoreArrowFocus>["metrics"],
  qualityFlags: string[],
): DemoTaskResult {
  const responseByTrial = new Map(
    responses.map((response) => [response.trialId, response]),
  );
  return {
    task: ARROW_FOCUS_TASK,
    seed: ARROW_FOCUS_SEED,
    stimulusPackId: "arrow_focus_v1",
    summaryScore: metrics,
    qualityFlags,
    confidence: metrics.valid_trial_count === trials.length ? 0.9 : 0.5,
    events: trials.map((trial) => {
      const response = responseByTrial.get(trial.trialId);
      return {
        stimulus: {
          targetDirection: trial.targetDirection,
          flankerDirection: trial.flankerDirection,
          congruency: trial.congruency,
          display: arrowStimulus(trial),
        },
        expectedResponse: trial.targetDirection,
        actualResponse: response?.direction ?? null,
        correct: response ? response.direction === trial.targetDirection : null,
        stimulusOnsetTime: response?.startedAt ?? 0,
        responseTime: response?.responseTime ?? null,
        rtMs: response?.rtMs ?? null,
        eventFlags: response
          ? [`input_${response.inputMode}`]
          : ["no_response"],
      };
    }),
  };
}

function arrowStimulus(trial: ArrowFocusTrial) {
  const target = arrowGlyph(trial.targetDirection);
  const flanker = arrowGlyph(trial.flankerDirection);
  return `${flanker}${flanker}${target}${flanker}${flanker}`;
}

function arrowGlyph(direction: ArrowDirection) {
  return direction === "left" ? "<" : ">";
}

function directionForKey(key: string): ArrowDirection | null {
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}
