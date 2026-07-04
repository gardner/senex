import type { TaskDefinition } from "@/lib/test-engine";

const BASE_ACCESSIBILITY: TaskDefinition["accessibility"] = {
  inputAlternatives: ["keyboard", "pointer"],
  notes: ["Do not rely on color alone.", "Allow full keyboard operation."],
};

export const REACTION_TIME_TASK: TaskDefinition = {
  taskId: "reaction_time_sprint",
  taskVersion: "1.0.0",
  domain: "reaction_speed",
  cadence: "daily",
  estimatedDurationSeconds: 120,
  instructions: {
    summary: "Respond as soon as the target appears.",
    steps: ["Wait for the target.", "Press Space or tap once."],
  },
  practice: { trialCount: 3, requiredAccuracy: 0.5 },
  stimulus: {
    generation: "seeded",
    trialCount: 24,
    seedPolicy: "required",
    alternateForms: true,
  },
  response: {
    types: ["keyboard", "pointer", "touch"],
    validWindowMs: { min: 120, max: 1000 },
    allowedKeys: ["Space"],
  },
  scoring: {
    scoringVersion: "1.0.0",
    primaryMetric: "median_rt_ms",
    metrics: [
      "median_rt_ms",
      "rt_variability",
      "anticipation_count",
      "lapse_count",
      "valid_trial_count",
      "fatigue_slope",
    ],
  },
  qualityRules: {
    anticipationMs: 120,
    lapseMs: 1000,
    minValidTrials: 16,
    maxLapseRate: 0.2,
  },
  accessibility: BASE_ACCESSIBILITY,
};

export const SYMBOL_MATCH_TASK = task("symbol_match", "processing_speed", [
  "correct_count",
  "accuracy",
  "median_rt_ms",
  "valid_trial_count",
]);

export const ARROW_FOCUS_TASK = task("arrow_focus", "attention_control", [
  "accuracy",
  "median_rt_ms",
  "conflict_cost_ms",
  "valid_trial_count",
]);

export const SEQUENCE_TAP_TASK = task("sequence_tap", "working_memory", [
  "span",
  "error_count",
  "missed_count",
]);

export const PAIR_LEARNING_TASK = task("pair_learning", "learning_memory", [
  "immediate_accuracy",
  "delayed_accuracy",
  "recognition_accuracy",
  "repeated_errors",
  "forgetting_delta",
]);

export const SEVEN_DAY_LEARNING_TASK = task(
  "seven_day_learning_week",
  "learning_memory",
  ["completed_days", "missed_days", "learning_slope", "retention"],
);

function task(
  taskId: string,
  domain: string,
  metrics: string[],
): TaskDefinition {
  return {
    taskId,
    taskVersion: "1.0.0",
    domain,
    cadence: taskId === "seven_day_learning_week" ? "weekly" : "daily",
    estimatedDurationSeconds: 180,
    instructions: {
      summary: `Complete ${taskId.replaceAll("_", " ")}.`,
      steps: ["Read the instructions.", "Respond accurately."],
    },
    practice: { trialCount: 2, requiredAccuracy: 0.5 },
    stimulus: {
      generation: "seeded",
      trialCount: 20,
      seedPolicy: "required",
      alternateForms: true,
    },
    response: {
      types: ["keyboard", "pointer", "touch"],
      validWindowMs: { min: 120, max: 3000 },
    },
    scoring: {
      scoringVersion: "1.0.0",
      primaryMetric: metrics[0],
      metrics,
    },
    qualityRules: {
      anticipationMs: 120,
      lapseMs: 3000,
      minValidTrials: 8,
      maxLapseRate: 0.25,
    },
    accessibility: BASE_ACCESSIBILITY,
  };
}
