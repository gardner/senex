import { describe, expect, it } from "vitest";

import {
  assertTaskDefinition,
  defineTask,
  type TaskDefinition,
} from "@/lib/test-engine";

const validDefinition: TaskDefinition = {
  taskId: "simple_reaction_time",
  taskVersion: "1.0.0",
  domain: "reaction_speed",
  cadence: "daily",
  estimatedDurationSeconds: 120,
  instructions: {
    summary: "Respond as soon as the target appears.",
    steps: ["Wait for the target.", "Press Space once."],
  },
  practice: { trialCount: 2, requiredAccuracy: 0.5 },
  stimulus: {
    generation: "seeded",
    trialCount: 12,
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
    minValidTrials: 8,
    maxLapseRate: 0.25,
  },
  accessibility: {
    inputAlternatives: ["keyboard", "pointer"],
    notes: ["No color-only targets."],
  },
};

describe("task definition contract", () => {
  it("accepts a complete versioned task definition", () => {
    const definition = defineTask(validDefinition);

    expect(definition.taskId).toBe("simple_reaction_time");
    expect(definition.taskVersion).toBe("1.0.0");
    expect(definition.scoring.scoringVersion).toBe("1.0.0");
    expect(() => assertTaskDefinition(definition)).not.toThrow();
  });

  it("rejects invalid definitions loudly", () => {
    expect(() =>
      assertTaskDefinition({
        ...validDefinition,
        taskVersion: "latest",
      }),
    ).toThrow(/taskVersion/);

    expect(() =>
      assertTaskDefinition({
        ...validDefinition,
        response: {
          ...validDefinition.response,
          validWindowMs: { min: 500, max: 100 },
        },
      }),
    ).toThrow(/valid response window/);

    expect(() =>
      assertTaskDefinition({
        ...validDefinition,
        scoring: {
          ...validDefinition.scoring,
          primaryMetric: "missing_metric",
        },
      }),
    ).toThrow(/primaryMetric/);
  });

  it("keeps task and scoring versions explicit for historical replay", () => {
    const definition = defineTask(validDefinition);

    expect(definition.taskVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(definition.scoring.scoringVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
