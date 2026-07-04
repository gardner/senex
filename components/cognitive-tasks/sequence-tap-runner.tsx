"use client";

import { useCallback, useEffect, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  SEQUENCE_TAP_TASK,
  generateSequenceTapTrials,
  scoreSequenceTap,
  type DemoTaskResult,
  type SequenceTapTrial,
} from "@/lib/cognitive-tasks";

import { persistTaskResult } from "./persist-demo-result";

const SEQUENCE_TAP_SEED = "interactive-sequence-tap-v1";
const SEQUENCE_TAP_TRIAL_COUNT = 3;

type Phase = "idle" | "running" | "saving" | "saved" | "error";
type InputMode = "keyboard" | "pointer" | "touch";
type SequenceResponse = {
  trialId: string;
  sequence: number[];
  missed: boolean;
  inputModes: InputMode[];
  startedAt: number;
  responseTime: number | null;
  rtMs: number | null;
};

export function SequenceTapRunner({ onSaved }: { onSaved: () => void }) {
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [trials, setTrials] = useState<SequenceTapTrial[]>([]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialStartedAt, setTrialStartedAt] = useState(0);
  const [responses, setResponses] = useState<SequenceResponse[]>([]);
  const [currentInput, setCurrentInput] = useState<number[]>([]);
  const [currentInputModes, setCurrentInputModes] = useState<InputMode[]>([]);
  const [summary, setSummary] = useState<
    ReturnType<typeof scoreSequenceTap>["metrics"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const currentTrial = trials[trialIndex] ?? null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const persistResponses = useCallback(
    async (nextResponses: SequenceResponse[]) => {
      try {
        setPhase("saving");
        const score = scoreSequenceTap(trials, nextResponses);
        await persistTaskResult(
          buildSequenceTapResult(trials, nextResponses, score.metrics),
          {
            contextSnapshot: {
              interactive: true,
            },
          },
        );
        setSummary(score.metrics);
        setPhase("saved");
        onSaved();
      } catch (caught) {
        setPhase("error");
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [onSaved, trials],
  );

  const completeResponse = useCallback(
    (response: SequenceResponse) => {
      const nextResponses = [...responses, response];
      if (trialIndex === trials.length - 1) {
        void persistResponses(nextResponses);
        return;
      }
      setResponses(nextResponses);
      setTrialIndex((current) => current + 1);
      setCurrentInput([]);
      setCurrentInputModes([]);
      setTrialStartedAt(performance.now());
    },
    [persistResponses, responses, trialIndex, trials.length],
  );

  const submitTile = useCallback(
    (tile: number, inputMode: InputMode) => {
      if (phase !== "running" || !currentTrial) return;
      const nextInput = [...currentInput, tile];
      const nextInputModes = [...currentInputModes, inputMode];
      if (nextInput.length < currentTrial.sequence.length) {
        setCurrentInput(nextInput);
        setCurrentInputModes(nextInputModes);
        return;
      }
      const now = performance.now();
      completeResponse({
        trialId: currentTrial.trialId,
        sequence: nextInput,
        missed: false,
        inputModes: nextInputModes,
        startedAt: Math.round(trialStartedAt),
        responseTime: Math.round(now),
        rtMs: Math.max(0, Math.round(now - trialStartedAt)),
      });
    },
    [
      completeResponse,
      currentInput,
      currentInputModes,
      currentTrial,
      phase,
      trialStartedAt,
    ],
  );

  useEffect(() => {
    if (phase !== "running" || !currentTrial) return;
    const listener = (event: KeyboardEvent) => {
      const tile = tileForKey(event.key);
      if (tile === null) return;
      event.preventDefault();
      submitTile(tile, "keyboard");
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [currentTrial, phase, submitTile]);

  function start() {
    setTrials(
      generateSequenceTapTrials(SEQUENCE_TAP_SEED, SEQUENCE_TAP_TRIAL_COUNT),
    );
    setResponses([]);
    setCurrentInput([]);
    setCurrentInputModes([]);
    setSummary(null);
    setError(null);
    setTrialIndex(0);
    setTrialStartedAt(performance.now());
    setPhase("running");
  }

  function markMissed() {
    if (phase !== "running" || !currentTrial) return;
    completeResponse({
      trialId: currentTrial.trialId,
      sequence: [],
      missed: true,
      inputModes: [],
      startedAt: Math.round(trialStartedAt),
      responseTime: null,
      rtMs: null,
    });
  }

  function handleTilePointer(
    event: PointerEvent<HTMLButtonElement>,
    tile: number,
  ) {
    event.preventDefault();
    submitTile(tile, event.pointerType === "touch" ? "touch" : "pointer");
  }

  return (
    <section
      aria-label="Sequence Tap runner"
      className="border-input space-y-3 rounded-md border px-3 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Sequence Tap</h3>
          <p className="text-muted-foreground">
            Replay the tile sequence in the same order.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={!isReady || phase === "running" || phase === "saving"}
        >
          Start Sequence Tap
        </Button>
      </div>

      {phase === "running" && currentTrial && (
        <div className="space-y-3">
          <p>
            Sequence Tap trial {trialIndex + 1} of {trials.length}
          </p>
          <div
            className="rounded-md bg-muted px-3 py-2 font-mono"
            data-testid="sequence-tap-current-sequence"
            data-sequence={currentTrial.sequence.join(",")}
          >
            Sequence:{" "}
            {currentTrial.sequence.map((tile) => String(tile + 1)).join(" ")}
          </div>
          <p>
            Replay progress {currentInput.length} of{" "}
            {currentTrial.sequence.length}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, tile) => (
              <Button
                key={tile}
                type="button"
                variant="outline"
                aria-label={`Tile ${tile + 1}`}
                onPointerDown={(event) => handleTilePointer(event, tile)}
              >
                {tile + 1}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={markMissed}>
            Mark missed
          </Button>
        </div>
      )}

      {phase === "saved" && summary && (
        <div className="space-y-1">
          <p>Sequence Tap saved locally.</p>
          <p>Sequence Tap span: {summary.span}</p>
          <p>Errors: {summary.error_count}</p>
          <p>Missed: {summary.missed_count}</p>
        </div>
      )}
      {phase === "error" && error && (
        <p className="text-destructive">{error}</p>
      )}
    </section>
  );
}

function buildSequenceTapResult(
  trials: SequenceTapTrial[],
  responses: SequenceResponse[],
  metrics: ReturnType<typeof scoreSequenceTap>["metrics"],
): DemoTaskResult {
  const responseByTrial = new Map(
    responses.map((response) => [response.trialId, response]),
  );
  const qualityFlags = responses.some((response) => response.missed)
    ? ["explicit_missed_response"]
    : [];
  return {
    task: SEQUENCE_TAP_TASK,
    seed: SEQUENCE_TAP_SEED,
    stimulusPackId: "sequence_tap_v1",
    summaryScore: metrics,
    qualityFlags,
    confidence: qualityFlags.length === 0 ? 0.9 : 0.75,
    events: trials.map((trial) => {
      const response = responseByTrial.get(trial.trialId);
      return {
        stimulus: {
          sequence: trial.sequence,
          spanLength: trial.spanLength,
        },
        expectedResponse: trial.sequence,
        actualResponse: response?.missed ? null : (response?.sequence ?? null),
        correct: response
          ? sequenceEquals(response.sequence, trial.sequence)
          : null,
        stimulusOnsetTime: response?.startedAt ?? 0,
        responseTime: response?.responseTime ?? null,
        rtMs: response?.rtMs ?? null,
        eventFlags: responseEventFlags(response),
      };
    }),
  };
}

function responseEventFlags(response: SequenceResponse | undefined) {
  if (!response) return ["no_response"];
  if (response.missed) return ["missed_response"];
  return Array.from(new Set(response.inputModes)).map(
    (mode) => `input_${mode}`,
  );
}

function sequenceEquals(left: number[], right: number[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function tileForKey(key: string) {
  if (!/^[1-9]$/.test(key)) return null;
  return Number(key) - 1;
}
