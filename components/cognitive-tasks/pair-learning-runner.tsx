"use client";

import { useCallback, useEffect, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  generatePairLearningPack,
  type PairLearningPack,
} from "@/lib/cognitive-tasks";

import {
  PAIR_COUNT,
  PAIR_LEARNING_SEED,
  buildPairLearningResult,
  isResponsePhase,
  scorePairLearningResponses,
  type InputMode,
  type PairLearningMetrics,
  type PairLearningPhase,
  type PairResponse,
  type ResponsePhase,
} from "./pair-learning-result";
import { PairLearningContent } from "./pair-learning-panels";
import { persistTaskResult } from "./persist-demo-result";

type PairStep =
  | { type: "continue"; nextIndex: number; nextPhase: PairLearningPhase }
  | { type: "persist" };

export function PairLearningRunner({ onSaved }: { onSaved: () => void }) {
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<PairLearningPhase>("idle");
  const [pack, setPack] = useState<PairLearningPack | null>(null);
  const [pairIndex, setPairIndex] = useState(0);
  const [phaseStartedAt, setPhaseStartedAt] = useState(0);
  const [responses, setResponses] = useState<PairResponse[]>([]);
  const [summary, setSummary] = useState<PairLearningMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canStart = isReady && phase !== "saving";
  const currentPair = pack?.pairs[pairIndex] ?? null;
  const targets = pack?.pairs.map((pair) => pair.target) ?? [];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const persistResponses = useCallback(
    async (nextResponses: PairResponse[]) => {
      if (!pack) {
        setPhase("error");
        setError("Pair Learning stimulus pack is missing.");
        return;
      }
      try {
        setPhase("saving");
        const metrics = scorePairLearningResponses(pack, nextResponses);
        await persistTaskResult(
          buildPairLearningResult(pack, nextResponses, metrics),
          { contextSnapshot: { interactive: true } },
        );
        setSummary(metrics);
        setPhase("saved");
        onSaved();
      } catch (caught) {
        setPhase("error");
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [onSaved, pack],
  );

  const recordResponse = useCallback(
    (actual: string, inputMode: InputMode) => {
      if (!currentPair || !isResponsePhase(phase)) return;
      const now = performance.now();
      const nextResponses = [
        ...responses,
        {
          phase,
          cue: currentPair.cue,
          expected: currentPair.target,
          actual,
          inputMode,
          startedAt: Math.round(phaseStartedAt),
          responseTime: Math.round(now),
          rtMs: Math.max(0, Math.round(now - phaseStartedAt)),
        },
      ];
      const step = nextPairStep(phase, pairIndex);
      if (step.type === "continue") {
        setResponses(nextResponses);
        setPairIndex(step.nextIndex);
        setPhase(step.nextPhase);
        setPhaseStartedAt(performance.now());
        return;
      }
      void persistResponses(nextResponses);
    },
    [
      currentPair,
      pairIndex,
      persistResponses,
      phase,
      phaseStartedAt,
      responses,
    ],
  );

  function start() {
    setPack(generatePairLearningPack(PAIR_LEARNING_SEED, PAIR_COUNT));
    setResponses([]);
    setSummary(null);
    setError(null);
    setPairIndex(0);
    setPhaseStartedAt(performance.now());
    setPhase("study");
  }

  function startPhase(nextPhase: ResponsePhase) {
    setPairIndex(0);
    setPhase(nextPhase);
    setPhaseStartedAt(performance.now());
  }

  function handleChoice(
    event: PointerEvent<HTMLButtonElement>,
    target: string,
  ) {
    event.preventDefault();
    recordResponse(target, event.pointerType === "touch" ? "touch" : "pointer");
  }

  return (
    <section
      aria-label="Pair Learning runner"
      className="border-input space-y-3 rounded-md border px-3 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Pair Learning</h3>
          <p className="text-muted-foreground">
            Study each cue and remember the paired target.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={!canStart}
        >
          Start Pair Learning
        </Button>
      </div>

      <PairLearningContent
        currentPair={currentPair}
        error={error}
        onChoice={handleChoice}
        onStartPhase={startPhase}
        pack={pack}
        pairIndex={pairIndex}
        phase={phase}
        summary={summary}
        targets={targets}
      />
    </section>
  );
}

function nextPairStep(phase: ResponsePhase, pairIndex: number): PairStep {
  if (pairIndex < PAIR_COUNT - 1) {
    return { type: "continue", nextIndex: pairIndex + 1, nextPhase: phase };
  }
  if (phase === "immediate") {
    return { type: "continue", nextIndex: 0, nextPhase: "delay" };
  }
  if (phase === "delayed") {
    return { type: "continue", nextIndex: 0, nextPhase: "recognition" };
  }
  return { type: "persist" };
}
