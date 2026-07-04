import { describe, expect, it } from "vitest";

import {
  ARROW_FOCUS_TASK,
  PAIR_LEARNING_TASK,
  REACTION_TIME_TASK,
  SEQUENCE_TAP_TASK,
  SEVEN_DAY_LEARNING_TASK,
  SYMBOL_MATCH_TASK,
  buildFullDemoBattery,
  generateArrowFocusTrials,
  generatePairLearningPack,
  generateReactionTimeTrials,
  generateSequenceTapTrials,
  generateSevenDayLearningSchedule,
  generateSymbolMatchTrials,
  scoreArrowFocus,
  scorePairLearning,
  scoreReactionTimeSprint,
  scoreSequenceTap,
  scoreSevenDayLearning,
  scoreSymbolMatch,
} from "@/lib/cognitive-tasks";
import { assertTaskDefinition } from "@/lib/test-engine";

describe("cognitive task definitions", () => {
  it("defines every E05 task as a valid versioned task", () => {
    for (const task of [
      REACTION_TIME_TASK,
      SYMBOL_MATCH_TASK,
      ARROW_FOCUS_TASK,
      SEQUENCE_TAP_TASK,
      PAIR_LEARNING_TASK,
      SEVEN_DAY_LEARNING_TASK,
    ]) {
      expect(() => assertTaskDefinition(task)).not.toThrow();
      expect(task.taskVersion).toBe("1.0.0");
    }
  });
});

describe("full demo battery", () => {
  it("builds one JSON-safe local result for every P0 task", () => {
    const results = buildFullDemoBattery("seed");
    expect(results.map((result) => result.task.taskId)).toEqual([
      "reaction_time_sprint",
      "symbol_match",
      "arrow_focus",
      "sequence_tap",
      "pair_learning",
      "seven_day_learning_week",
    ]);
    for (const result of results) {
      expect(result.events.length).toBeGreaterThan(0);
      expect(() => JSON.stringify(result.summaryScore)).not.toThrow();
      expect(
        Object.values(result.summaryScore).every(
          (value) => typeof value !== "number" || Number.isFinite(value),
        ),
      ).toBe(true);
    }
  });
});

describe("reaction time sprint", () => {
  it("generates deterministic random-delay trials and scores quality-aware metrics", () => {
    const first = generateReactionTimeTrials("seed-1", 8);
    const second = generateReactionTimeTrials("seed-1", 8);
    const alternate = generateReactionTimeTrials("seed-2", 8);

    expect(first).toEqual(second);
    expect(first).not.toEqual(alternate);
    expect(
      first.every((trial) => trial.delayMs >= 800 && trial.delayMs <= 2400),
    ).toBe(true);

    const score = scoreReactionTimeSprint({
      seed: "seed-1",
      responses: [300, 350, 410, 900, 1100, 80, null, 450],
    });

    expect(score.metrics.median_rt_ms).toBe(410);
    expect(score.metrics.anticipation_count).toBe(1);
    expect(score.metrics.lapse_count).toBe(1);
    expect(score.metrics.no_response_count).toBe(1);
    expect(score.metrics.valid_trial_count).toBe(5);
    expect(score.metrics.fatigue_slope).toBe(150);
    expect(score.qualityFlags).toContain("too_few_valid_trials");
    expect(score.confidence).toBeLessThan(1);

    const edgeInvalidScore = scoreReactionTimeSprint({
      seed: "seed-1",
      responses: [80, 300, 450, 1100],
    });
    expect(edgeInvalidScore.metrics.fatigue_slope).toBe(150);
  });

  it("keeps no-response scoring JSON-safe", () => {
    const score = scoreReactionTimeSprint({
      seed: "seed-1",
      responses: [null, null],
    });

    expect(score.metrics.median_rt_ms).toBe(0);
    expect(score.metrics.rt_variability).toBe(0);
    expect(score.metrics.valid_trial_count).toBe(0);
    expect(score.qualityFlags).toContain("too_few_valid_trials");
    expect(score.confidence).toBe(0);
  });
});

describe("symbol match", () => {
  it("generates deterministic symbol trials and scores speed plus accuracy", () => {
    const trials = generateSymbolMatchTrials("symbols-1", 12);
    expect(trials).toEqual(generateSymbolMatchTrials("symbols-1", 12));
    expect(trials).not.toEqual(generateSymbolMatchTrials("symbols-2", 12));

    const responses = trials.map((trial, index) => ({
      trialId: trial.trialId,
      selectedSymbol: index === 0 ? "wrong" : trial.correctSymbol,
      rtMs: 650 + index,
    }));
    const score = scoreSymbolMatch(trials, responses);

    expect(score.metrics.correct_count).toBe(11);
    expect(score.metrics.accuracy).toBeCloseTo(11 / 12);
    expect(score.metrics.valid_trial_count).toBe(12);
  });

  it("keeps empty symbol-match scoring JSON-safe", () => {
    const score = scoreSymbolMatch(
      generateSymbolMatchTrials("symbols-1", 2),
      [],
    );

    expect(score.metrics.median_rt_ms).toBe(0);
    expect(score.metrics.valid_trial_count).toBe(0);
  });
});

describe("arrow focus", () => {
  it("balances congruent and incongruent trials and computes conflict cost", () => {
    const trials = generateArrowFocusTrials("arrow-1", 20);
    const congruent = trials.filter(
      (trial) => trial.congruency === "congruent",
    );
    const incongruent = trials.filter(
      (trial) => trial.congruency === "incongruent",
    );
    expect(congruent).toHaveLength(10);
    expect(incongruent).toHaveLength(10);
    expect(trials).toEqual(generateArrowFocusTrials("arrow-1", 20));

    const responses = trials.map((trial) => ({
      trialId: trial.trialId,
      direction: trial.targetDirection,
      rtMs: trial.congruency === "congruent" ? 400 : 520,
    }));
    const score = scoreArrowFocus(trials, responses);
    expect(score.metrics.conflict_cost_ms).toBe(120);
    expect(score.metrics.accuracy).toBe(1);
  });

  it("keeps missing arrow-focus responses JSON-safe", () => {
    const score = scoreArrowFocus(generateArrowFocusTrials("arrow-1", 2), []);

    expect(score.metrics.median_rt_ms).toBe(0);
    expect(score.metrics.conflict_cost_ms).toBe(0);
    expect(score.metrics.valid_trial_count).toBe(0);
  });
});

describe("sequence tap", () => {
  it("generates seeded tile sequences and scores span plus explicit misses", () => {
    const trials = generateSequenceTapTrials("sequence-1", 4);
    expect(trials).toEqual(generateSequenceTapTrials("sequence-1", 4));
    expect(trials[0].sequence).toHaveLength(2);
    expect(trials[3].sequence).toHaveLength(5);

    const score = scoreSequenceTap(trials, [
      { trialId: trials[0].trialId, sequence: trials[0].sequence },
      { trialId: trials[1].trialId, sequence: trials[1].sequence },
      { trialId: trials[2].trialId, sequence: [99] },
      { trialId: trials[3].trialId, sequence: [], missed: true },
    ]);

    expect(score.metrics.span).toBe(3);
    expect(score.metrics.error_count).toBe(1);
    expect(score.metrics.missed_count).toBe(1);
  });
});

describe("pair learning and seven-day learning", () => {
  it("scores versioned pair-learning packs", () => {
    const pack = generatePairLearningPack("pair-1", 4);
    expect(pack).toEqual(generatePairLearningPack("pair-1", 4));
    expect(pack.packVersion).toBe("1.0.0");

    const score = scorePairLearning(pack, {
      immediate: [pack.pairs[0].target, pack.pairs[1].target],
      delayed: [pack.pairs[0].target],
      recognition: pack.pairs.map((pair) => pair.target),
      repeatedErrors: 2,
    });

    expect(score.metrics.immediate_accuracy).toBe(0.5);
    expect(score.metrics.delayed_accuracy).toBe(0.25);
    expect(score.metrics.recognition_accuracy).toBe(1);
    expect(score.metrics.forgetting_delta).toBe(0.25);
  });

  it("builds deterministic seven-day schedules and preserves missed days", () => {
    const schedule = generateSevenDayLearningSchedule({
      month: "2026-07",
      seed: "learning-1",
      missedDays: [3],
    });
    expect(schedule).toEqual(
      generateSevenDayLearningSchedule({
        month: "2026-07",
        seed: "learning-1",
        missedDays: [3],
      }),
    );
    expect(schedule.days).toHaveLength(7);
    expect(schedule.days[2].missed).toBe(true);

    const score = scoreSevenDayLearning(schedule, [
      0.25,
      0.5,
      null,
      0.75,
      0.8,
      0.85,
      0.9,
    ]);
    expect(score.metrics.completed_days).toBe(6);
    expect(score.metrics.missed_days).toBe(1);
    expect(score.metrics.retention).toBe(0.9);
  });
});
