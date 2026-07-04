import { describe, expect, it } from "vitest";

import {
  advanceRunner,
  buildPointerInput,
  buildVisibilityFlag,
  computeBaselineState,
  computeTrendSummary,
  createInitialRunnerState,
  evaluateTaskRunQuality,
  evaluateTrialQuality,
  measureReactionTime,
  scoreReactionTimeRun,
  type QualityFlag,
  type RunnerEvent,
  type TaskDefinition,
  type TrialResult,
} from "@/lib/test-engine";

const task: TaskDefinition = {
  taskId: "simple_reaction_time",
  taskVersion: "1.0.0",
  domain: "reaction_speed",
  cadence: "daily",
  estimatedDurationSeconds: 120,
  instructions: {
    summary: "Respond quickly.",
    steps: ["Wait.", "Press Space."],
  },
  practice: { trialCount: 1, requiredAccuracy: 0.5 },
  stimulus: {
    generation: "seeded",
    trialCount: 4,
    seedPolicy: "required",
    alternateForms: true,
  },
  response: {
    types: ["keyboard", "pointer"],
    validWindowMs: { min: 120, max: 2000 },
    allowedKeys: ["Space"],
  },
  scoring: {
    scoringVersion: "1.0.0",
    primaryMetric: "median_rt_ms",
    metrics: ["median_rt_ms", "mean_rt_ms", "valid_trial_count"],
  },
  qualityRules: {
    anticipationMs: 120,
    lapseMs: 1000,
    minValidTrials: 3,
    maxLapseRate: 0.25,
  },
  accessibility: {
    inputAlternatives: ["keyboard", "pointer"],
    notes: [],
  },
};

describe("test runner state machine", () => {
  it("rejects invalid transitions and supports save or abandon after interruption", () => {
    const setup = createInitialRunnerState(task);
    expect(() => advanceRunner(setup, event("startTrial"))).toThrow(
      /Invalid runner transition/,
    );

    const interrupted = [
      event("showInstructions"),
      event("startPractice"),
      event("finishPractice"),
      event("markReady"),
      event("startTrial"),
      event("interrupt", "window_blur"),
    ].reduce(advanceRunner, setup);

    expect(interrupted.status).toBe("interrupted");
    expect(interrupted.accessibleStatus).toContain("interrupted");
    expect(advanceRunner(interrupted, event("save")).status).toBe("saved");
    expect(advanceRunner(interrupted, event("abandon")).status).toBe(
      "abandoned",
    );
  });

  it("moves through practice, trials, completion, and saved states", () => {
    const events: RunnerEvent[] = [
      event("showInstructions"),
      event("startPractice"),
      event("finishPractice"),
      event("markReady"),
      event("startTrial"),
      event("recordResponse"),
      event("nextTrial"),
      event("startTrial"),
      event("complete"),
      event("save"),
    ];

    const finalState = events.reduce(
      advanceRunner,
      createInitialRunnerState(task),
    );
    expect(finalState.status).toBe("saved");
    expect(finalState.currentTrialIndex).toBe(1);
  });
});

describe("timing, input, and quality flags", () => {
  it("uses monotonic reaction timing and rejects impossible values", () => {
    expect(measureReactionTime(1000, 1412)).toBe(412);
    expect(() => measureReactionTime(1412, 1000)).toThrow(/negative/);
  });

  it("captures pointer metadata and interruption flags", () => {
    expect(buildPointerInput({ pointerType: "touch", button: 0 }).method).toBe(
      "touch",
    );

    const hidden = buildVisibilityFlag({ hidden: true, at: 2000 });
    expect(hidden.code).toBe("tab_hidden");
    expect(hidden.level).toBe("task_run");
  });

  it("flags anticipation, lapse, no response, and multiple responses", () => {
    expect(
      flagCodes(evaluateTrialQuality(trial({ rtMs: 90 }), task)),
    ).toContain("anticipation");
    expect(
      flagCodes(evaluateTrialQuality(trial({ rtMs: 1200 }), task)),
    ).toContain("lapse");
    expect(
      flagCodes(evaluateTrialQuality(trial({ responded: false }), task)),
    ).toContain("no_response");
    expect(
      flagCodes(evaluateTrialQuality(trial({ responseCount: 2 }), task)),
    ).toContain("multiple_responses");
  });

  it("adds task-run quality flags for hidden tabs and too few valid trials", () => {
    const flags = evaluateTaskRunQuality({
      definition: task,
      trials: [trial({ rtMs: 400 }), trial({ rtMs: 1200 })],
      interruptions: [buildVisibilityFlag({ hidden: true, at: 2000 })],
    });

    expect(flagCodes(flags)).toContain("too_few_valid_trials");
    expect(flagCodes(flags)).toContain("tab_hidden");
  });
});

describe("scoring, baselines, and trends", () => {
  it("scores reaction-time runs deterministically and downgrades low quality", () => {
    const trials = [
      trial({ rtMs: 300 }),
      trial({ rtMs: 400 }),
      trial({ rtMs: 500 }),
      trial({ rtMs: 1200 }),
    ];

    const score = scoreReactionTimeRun({
      definition: task,
      taskRunId: "task_run_1",
      sessionId: "session_1",
      trials,
      qualityFlags: evaluateTaskRunQuality({ definition: task, trials }),
    });

    expect(score.metrics.median_rt_ms).toBe(400);
    expect(score.metrics.valid_trial_count).toBe(3);
    expect(score.confidence).toBeLessThan(1);
    expect(score.resultState).toBe("low_confidence");
    expect(score.scoringVersion).toBe("1.0.0");

    const evenScore = scoreReactionTimeRun({
      definition: task,
      taskRunId: "task_run_2",
      sessionId: "session_1",
      trials: [
        trial({ rtMs: 300 }),
        trial({ rtMs: 400 }),
        trial({ rtMs: 500 }),
        trial({ rtMs: 600 }),
      ],
      qualityFlags: [],
    });
    expect(evenScore.metrics.median_rt_ms).toBe(450);
  });

  it("does not create a definitive baseline from one session", () => {
    expect(computeBaselineState([{ value: 400, confidence: 0.9 }]).state).toBe(
      "forming",
    );
    expect(
      computeBaselineState([
        { value: 400, confidence: 0.9 },
        { value: 410, confidence: 0.9 },
        { value: 390, confidence: 0.9 },
      ]).state,
    ).toBe("usable");
  });

  it("summarizes 7-day and 30-day trends with uncertainty", () => {
    const trend = computeTrendSummary([
      sample("2026-07-01", 420, 0.9),
      sample("2026-07-04", 400, 0.9),
      sample("2026-06-10", 450, 0.4),
    ]);

    expect(trend.sevenDay.state).toBe("usable");
    expect(trend.thirtyDay.state).toBe("low_confidence");
  });
});

function event(type: RunnerEvent["type"], reason?: string): RunnerEvent {
  return { type, at: 1000, reason };
}

function trial(input: Partial<TrialResult>): TrialResult {
  return {
    trialIndex: 0,
    expectedResponse: "Space",
    actualResponse: "Space",
    correct: true,
    responded: true,
    responseCount: 1,
    rtMs: 400,
    ...input,
  };
}

function flagCodes(flags: QualityFlag[]) {
  return flags.map((flag) => flag.code);
}

function sample(date: string, value: number, confidence: number) {
  return { completedAt: `${date}T00:00:00.000Z`, value, confidence };
}
