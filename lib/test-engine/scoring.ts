import { evaluateTrialQuality } from "./quality";
import type { QualityFlag, TaskDefinition, TrialResult } from "./types";

export interface ScoringResult {
  scoreId: string;
  sessionId: string;
  taskRunId: string;
  domain: string;
  scoringVersion: string;
  metrics: Record<string, number>;
  confidence: number;
  resultState: "valid" | "low_confidence" | "insufficient_data";
  qualityFlags: string[];
}

export function scoreReactionTimeRun(input: {
  definition: TaskDefinition;
  sessionId: string;
  taskRunId: string;
  trials: TrialResult[];
  qualityFlags: QualityFlag[];
}): ScoringResult {
  const validRts = input.trials
    .filter(
      (trial) => evaluateTrialQuality(trial, input.definition).length === 0,
    )
    .map((trial) => trial.rtMs)
    .filter((rtMs): rtMs is number => rtMs !== null)
    .toSorted((a, b) => a - b);
  const confidence = confidenceFor(validRts.length, input.trials.length);
  return {
    scoreId: `score_${input.taskRunId}_${input.definition.scoring.primaryMetric}`,
    sessionId: input.sessionId,
    taskRunId: input.taskRunId,
    domain: input.definition.domain,
    scoringVersion: input.definition.scoring.scoringVersion,
    metrics: {
      median_rt_ms: median(validRts),
      mean_rt_ms: mean(validRts),
      valid_trial_count: validRts.length,
    },
    confidence,
    resultState: resultState(confidence, validRts.length),
    qualityFlags: input.qualityFlags.map((flag) => flag.code),
  };
}

function confidenceFor(validCount: number, totalCount: number) {
  if (totalCount === 0) return 0;
  return Math.max(0, Math.min(1, validCount / totalCount));
}

function resultState(confidence: number, validCount: number) {
  if (validCount === 0) return "insufficient_data";
  if (confidence < 0.8) return "low_confidence";
  return "valid";
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[middle];
  return (values[middle - 1] + values[middle]) / 2;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
