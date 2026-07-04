"use client";

import { useCallback, useEffect, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import type { SevenDayLearningSchedule } from "@/lib/cognitive-tasks";

import {
  SEVEN_DAY_COUNT,
  buildSevenDayLearningResult,
  buildSevenDaySchedule,
  scoreSevenDayResponses,
  type SevenDayInputMode,
  type SevenDayMetrics,
  type SevenDayPhase,
  type SevenDayResponse,
} from "./seven-day-learning-result";
import { SevenDayLearningContent } from "./seven-day-learning-panels";
import { persistTaskResult } from "./persist-demo-result";

export function SevenDayLearningRunner({ onSaved }: { onSaved: () => void }) {
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<SevenDayPhase>("idle");
  const [schedule, setSchedule] = useState<SevenDayLearningSchedule | null>(
    null,
  );
  const [dayIndex, setDayIndex] = useState(0);
  const [dayStartedAt, setDayStartedAt] = useState(0);
  const [responses, setResponses] = useState<SevenDayResponse[]>([]);
  const [summary, setSummary] = useState<SevenDayMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canStart = isReady && phase !== "saving";
  const currentDay = schedule?.days[dayIndex] ?? null;
  const currentPair =
    schedule?.pack.pairs[dayIndex % schedule.pack.pairs.length] ?? null;
  const targets = schedule?.pack.pairs.map((pair) => pair.target) ?? [];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const persistResponses = useCallback(
    async (nextResponses: SevenDayResponse[]) => {
      if (!schedule) {
        setPhase("error");
        setError("Seven-Day Learning schedule is missing.");
        return;
      }
      try {
        setPhase("saving");
        const missedDays = nextResponses
          .filter((response) => response.missed)
          .map((response) => response.day);
        const finalSchedule = buildSevenDaySchedule(missedDays);
        const metrics = scoreSevenDayResponses(finalSchedule, nextResponses);
        await persistTaskResult(
          buildSevenDayLearningResult(finalSchedule, nextResponses, metrics),
          { contextSnapshot: { interactive: true } },
        );
        setSchedule(finalSchedule);
        setSummary(metrics);
        setPhase("saved");
        onSaved();
      } catch (caught) {
        setPhase("error");
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [onSaved, schedule],
  );

  const completeDay = useCallback(
    (response: SevenDayResponse) => {
      const nextResponses = [...responses, response];
      if (dayIndex === SEVEN_DAY_COUNT - 1) {
        void persistResponses(nextResponses);
        return;
      }
      setResponses(nextResponses);
      setDayIndex((current) => current + 1);
      setDayStartedAt(performance.now());
    },
    [dayIndex, persistResponses, responses],
  );

  const recordRecall = useCallback(
    (actual: string, inputMode: SevenDayInputMode) => {
      if (phase !== "running" || !currentDay || !currentPair) return;
      const now = performance.now();
      completeDay({
        day: currentDay.day,
        cue: currentPair.cue,
        expected: currentPair.target,
        actual,
        missed: false,
        inputMode,
        startedAt: Math.round(dayStartedAt),
        responseTime: Math.round(now),
        rtMs: Math.max(0, Math.round(now - dayStartedAt)),
      });
    },
    [completeDay, currentDay, currentPair, dayStartedAt, phase],
  );

  const markMissed = useCallback(() => {
    if (phase !== "running" || !currentDay || !currentPair) return;
    completeDay({
      day: currentDay.day,
      cue: currentPair.cue,
      expected: currentPair.target,
      actual: null,
      missed: true,
      inputMode: null,
      startedAt: Math.round(dayStartedAt),
      responseTime: null,
      rtMs: null,
    });
  }, [completeDay, currentDay, currentPair, dayStartedAt, phase]);

  const handleChoice = useCallback(
    (event: PointerEvent<HTMLButtonElement>, target: string) => {
      event.preventDefault();
      recordRecall(target, event.pointerType === "touch" ? "touch" : "pointer");
    },
    [recordRecall],
  );

  function start() {
    setSchedule(buildSevenDaySchedule());
    setResponses([]);
    setSummary(null);
    setError(null);
    setDayIndex(0);
    setDayStartedAt(performance.now());
    setPhase("running");
  }

  return (
    <section
      aria-label="Seven-Day Learning runner"
      className="border-input space-y-3 rounded-md border px-3 py-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Seven-Day Learning</h3>
          <p className="text-muted-foreground">
            Repeat the monthly pair pack across seven scheduled days.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={!canStart}
        >
          Start Seven-Day Learning
        </Button>
      </div>

      <SevenDayLearningContent
        currentDay={currentDay}
        currentPair={currentPair}
        error={error}
        onChoice={handleChoice}
        onMarkMissed={markMissed}
        phase={phase}
        summary={summary}
        targets={targets}
      />
    </section>
  );
}
