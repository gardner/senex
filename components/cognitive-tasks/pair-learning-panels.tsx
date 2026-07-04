import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import type { PairLearningPack } from "@/lib/cognitive-tasks";

import {
  DELAY_DURATION_MS,
  PAIR_COUNT,
  isResponsePhase,
  type PairLearningMetrics,
  type PairLearningPhase,
  type ResponsePhase,
} from "./pair-learning-result";

type PairLearningChoice = NonNullable<PairLearningPack["pairs"][number]>;

type PairLearningContentProps = {
  currentPair: PairLearningChoice | null;
  error: string | null;
  onChoice: (event: PointerEvent<HTMLButtonElement>, target: string) => void;
  onStartPhase: (phase: ResponsePhase) => void;
  pack: PairLearningPack | null;
  pairIndex: number;
  phase: PairLearningPhase;
  summary: PairLearningMetrics | null;
  targets: string[];
};

export function PairLearningContent({
  currentPair,
  error,
  onChoice,
  onStartPhase,
  pack,
  pairIndex,
  phase,
  summary,
  targets,
}: PairLearningContentProps) {
  if (phase === "study" && pack) {
    return <StudyPanel pack={pack} onStartPhase={onStartPhase} />;
  }
  if (isResponsePhase(phase) && currentPair) {
    return (
      <RecallPanel
        cue={currentPair.cue}
        expected={currentPair.target}
        index={pairIndex}
        onChoice={onChoice}
        phase={phase}
        targets={targets}
      />
    );
  }
  if (phase === "delay") {
    return (
      <div className="space-y-2">
        <p>Delay marker: {DELAY_DURATION_MS} ms</p>
        <Button type="button" onClick={() => onStartPhase("delayed")}>
          Start delayed recall
        </Button>
      </div>
    );
  }
  if (phase === "saved" && summary) return <SavedPanel summary={summary} />;
  if (phase === "error" && error) {
    return <p className="text-destructive">{error}</p>;
  }
  return null;
}

function StudyPanel({
  onStartPhase,
  pack,
}: {
  onStartPhase: (phase: ResponsePhase) => void;
  pack: PairLearningPack;
}) {
  return (
    <div className="space-y-3">
      <p>Study the pairs</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {pack.pairs.map((pair) => (
          <li key={pair.cue} className="border-input rounded-md border p-2">
            <span className="font-medium">{pair.cue}</span> / {pair.target}
          </li>
        ))}
      </ul>
      <Button type="button" onClick={() => onStartPhase("immediate")}>
        Start immediate recall
      </Button>
    </div>
  );
}

function RecallPanel({
  cue,
  expected,
  index,
  onChoice,
  phase,
  targets,
}: {
  cue: string;
  expected: string;
  index: number;
  onChoice: (event: PointerEvent<HTMLButtonElement>, target: string) => void;
  phase: ResponsePhase;
  targets: string[];
}) {
  const prefix = phase === "recognition" ? "Recognize" : "Choose";
  return (
    <div className="space-y-3">
      <p>
        {phaseLabel(phase)} {index + 1} of {PAIR_COUNT}
      </p>
      <div
        className="rounded-md bg-muted px-3 py-2"
        data-testid="pair-learning-current-target"
        data-target={expected}
      >
        Cue: <span className="font-medium">{cue}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {targets.map((target) => (
          <Button
            key={target}
            type="button"
            variant="outline"
            aria-label={`${prefix} ${target}`}
            onPointerDown={(event) => onChoice(event, target)}
          >
            {target}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SavedPanel({ summary }: { summary: PairLearningMetrics }) {
  return (
    <div className="space-y-1">
      <p>Pair Learning saved locally.</p>
      <p>Immediate accuracy: {Math.round(summary.immediate_accuracy * 100)}%</p>
      <p>Delayed accuracy: {Math.round(summary.delayed_accuracy * 100)}%</p>
      <p>
        Recognition accuracy: {Math.round(summary.recognition_accuracy * 100)}%
      </p>
    </div>
  );
}

function phaseLabel(phase: ResponsePhase) {
  if (phase === "immediate") return "Immediate recall";
  if (phase === "delayed") return "Delayed recall";
  return "Recognition";
}
