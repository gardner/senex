"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  SYMBOL_MATCH_TASK,
  generateSymbolMatchTrials,
  scoreSymbolMatch,
  type DemoTaskResult,
  type SymbolMatchTrial,
} from "@/lib/cognitive-tasks";

import { persistTaskResult } from "./persist-demo-result";
import { useTaskInterruptions } from "./use-task-interruptions";

const SYMBOL_MATCH_SEED = "interactive-symbol-match-v1";
const SYMBOL_MATCH_TRIAL_COUNT = 6;

type Phase = "idle" | "running" | "saving" | "saved" | "error";
type SymbolResponse = {
  trialId: string;
  selectedSymbol: string;
  rtMs: number;
  startedAt: number;
  responseTime: number;
  inputMode: "keyboard" | "pointer";
};

export function SymbolMatchRunner({ onSaved }: { onSaved: () => void }) {
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [trials, setTrials] = useState<SymbolMatchTrial[]>([]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialStartedAt, setTrialStartedAt] = useState(0);
  const [responses, setResponses] = useState<SymbolResponse[]>([]);
  const [summary, setSummary] = useState<{
    correctCount: number;
    accuracy: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { readInterruptionCodes, resetInterruptions } = useTaskInterruptions(
    phase === "running",
  );

  const currentTrial = trials[trialIndex] ?? null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const persistResponses = useCallback(
    async (nextResponses: SymbolResponse[]) => {
      try {
        setPhase("saving");
        const score = scoreSymbolMatch(trials, nextResponses);
        await persistTaskResult(
          buildSymbolMatchResult(
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
          correctCount: score.metrics.correct_count,
          accuracy: score.metrics.accuracy,
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
    (selectedSymbol: string, inputMode: SymbolResponse["inputMode"]) => {
      if (phase !== "running" || !currentTrial) return;
      const now = performance.now();
      const nextResponses = [
        ...responses,
        {
          trialId: currentTrial.trialId,
          selectedSymbol,
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
      const choiceIndex = Number(event.key) - 1;
      const choice = currentTrial.choices[choiceIndex];
      if (!choice) return;
      event.preventDefault();
      submitResponse(choice, "keyboard");
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [currentTrial, phase, submitResponse]);

  function start() {
    resetInterruptions();
    setTrials(
      generateSymbolMatchTrials(SYMBOL_MATCH_SEED, SYMBOL_MATCH_TRIAL_COUNT),
    );
    setResponses([]);
    setSummary(null);
    setError(null);
    setTrialIndex(0);
    setTrialStartedAt(performance.now());
    setPhase("running");
  }

  return (
    <section
      aria-label="Symbol Match runner"
      className="border-input space-y-3 rounded-md border px-3 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Symbol Match</h3>
          <p className="text-muted-foreground">
            Match each target symbol to the same symbol below.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={!isReady || phase === "running" || phase === "saving"}
        >
          Start Symbol Match
        </Button>
      </div>

      {phase === "running" && currentTrial && (
        <div className="space-y-3">
          <p>
            Symbol Match trial {trialIndex + 1} of {trials.length}
          </p>
          <p>
            Target symbol:{" "}
            <strong data-testid="symbol-match-target">
              {currentTrial.targetSymbol}
            </strong>
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {currentTrial.choices.map((choice, index) => (
              <Button
                key={choice}
                type="button"
                variant="outline"
                aria-label={`Choose ${choice}`}
                data-symbol-value={choice}
                data-testid={`symbol-match-choice-${index}`}
                onClick={() => submitResponse(choice, "pointer")}
              >
                {index + 1} {choice}
              </Button>
            ))}
          </div>
        </div>
      )}

      {phase === "saved" && summary && (
        <div className="space-y-1">
          <p>Symbol Match saved locally.</p>
          <p>Symbol Match correct count: {summary.correctCount}</p>
          <p>Accuracy: {Math.round(summary.accuracy * 100)}%</p>
        </div>
      )}
      {phase === "error" && error && (
        <p className="text-destructive">{error}</p>
      )}
    </section>
  );
}

function buildSymbolMatchResult(
  trials: SymbolMatchTrial[],
  responses: SymbolResponse[],
  metrics: ReturnType<typeof scoreSymbolMatch>["metrics"],
  qualityFlags: string[],
): DemoTaskResult {
  const responseByTrial = new Map(
    responses.map((response) => [response.trialId, response]),
  );
  return {
    task: SYMBOL_MATCH_TASK,
    seed: SYMBOL_MATCH_SEED,
    stimulusPackId: "symbol_match_v1",
    summaryScore: metrics,
    qualityFlags,
    confidence: metrics.valid_trial_count === trials.length ? 0.95 : 0.5,
    events: trials.map((trial) => {
      const response = responseByTrial.get(trial.trialId);
      return {
        stimulus: {
          targetSymbol: trial.targetSymbol,
          choices: trial.choices,
        },
        expectedResponse: trial.correctSymbol,
        actualResponse: response?.selectedSymbol ?? null,
        correct: response
          ? response.selectedSymbol === trial.correctSymbol
          : null,
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
