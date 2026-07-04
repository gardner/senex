import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import type { SevenDayLearningSchedule } from "@/lib/cognitive-tasks";

import {
  SEVEN_DAY_COUNT,
  type SevenDayMetrics,
  type SevenDayPhase,
} from "./seven-day-learning-result";

type LearningDay = SevenDayLearningSchedule["days"][number];
type LearningPair = SevenDayLearningSchedule["pack"]["pairs"][number];

type SevenDayLearningContentProps = {
  currentDay: LearningDay | null;
  currentPair: LearningPair | null;
  error: string | null;
  onChoice: (event: PointerEvent<HTMLButtonElement>, target: string) => void;
  onMarkMissed: () => void;
  phase: SevenDayPhase;
  summary: SevenDayMetrics | null;
  targets: string[];
};

export function SevenDayLearningContent({
  currentDay,
  currentPair,
  error,
  onChoice,
  onMarkMissed,
  phase,
  summary,
  targets,
}: SevenDayLearningContentProps) {
  if (phase === "running" && currentDay && currentPair) {
    return (
      <RunningPanel
        currentDay={currentDay}
        currentPair={currentPair}
        onChoice={onChoice}
        onMarkMissed={onMarkMissed}
        targets={targets}
      />
    );
  }
  if (phase === "saved" && summary) return <SavedPanel summary={summary} />;
  if (phase === "error" && error) {
    return <p className="text-destructive">{error}</p>;
  }
  return null;
}

function RunningPanel({
  currentDay,
  currentPair,
  onChoice,
  onMarkMissed,
  targets,
}: {
  currentDay: LearningDay;
  currentPair: LearningPair;
  onChoice: (event: PointerEvent<HTMLButtonElement>, target: string) => void;
  onMarkMissed: () => void;
  targets: string[];
}) {
  return (
    <div className="space-y-3">
      <p>
        Learning day {currentDay.day} of {SEVEN_DAY_COUNT}
      </p>
      <div
        className="rounded-md bg-muted px-3 py-2"
        data-testid="seven-day-current-target"
        data-target={currentPair.target}
      >
        Cue: <span className="font-medium">{currentPair.cue}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {targets.map((target) => (
          <Button
            key={target}
            type="button"
            variant="outline"
            aria-label={`Recall ${target}`}
            onPointerDown={(event) => onChoice(event, target)}
          >
            {target}
          </Button>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={onMarkMissed}>
        Mark day missed
      </Button>
    </div>
  );
}

function SavedPanel({ summary }: { summary: SevenDayMetrics }) {
  return (
    <div className="space-y-1">
      <p>Seven-Day Learning saved locally.</p>
      <p>
        Monthly summary: {summary.completed_days} completed days,{" "}
        {summary.missed_days} missed.
      </p>
      <p>Retention: {Math.round(summary.retention * 100)}%</p>
    </div>
  );
}
