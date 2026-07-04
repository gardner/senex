import { REACTION_TIME_TASK } from "./definitions";
import { createSeededRandom } from "./random";

export interface ReactionTimeTrial {
  trialId: string;
  trialIndex: number;
  delayMs: number;
}

export function generateReactionTimeTrials(
  seed: string,
  count = REACTION_TIME_TASK.stimulus.trialCount,
): ReactionTimeTrial[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, (_, index) => ({
    trialId: `reaction_${seed}_${index}`,
    trialIndex: index,
    delayMs: 800 + Math.floor(random() * 1601),
  }));
}

export function scoreReactionTimeSprint(input: {
  seed: string;
  responses: Array<number | null>;
}) {
  const valid = input.responses
    .filter((rtMs): rtMs is number => rtMs !== null)
    .filter(isValidResponse)
    .toSorted((a, b) => a - b);
  const anticipationCount = input.responses.filter(
    (rtMs) =>
      rtMs !== null && rtMs < REACTION_TIME_TASK.qualityRules.anticipationMs,
  ).length;
  const lapseCount = input.responses.filter(
    (rtMs) => rtMs !== null && rtMs > REACTION_TIME_TASK.qualityRules.lapseMs,
  ).length;
  const noResponseCount = input.responses.filter(
    (rtMs) => rtMs === null,
  ).length;
  const qualityFlags = qualityFlagsFor(
    valid.length,
    lapseCount,
    input.responses.length,
  );
  return {
    taskId: REACTION_TIME_TASK.taskId,
    taskVersion: REACTION_TIME_TASK.taskVersion,
    stimulusSeed: input.seed,
    metrics: {
      median_rt_ms: median(valid),
      rt_variability: iqr(valid),
      anticipation_count: anticipationCount,
      lapse_count: lapseCount,
      no_response_count: noResponseCount,
      valid_trial_count: valid.length,
      fatigue_slope: fatigueSlope(input.responses),
    },
    qualityFlags,
    confidence: confidence(
      valid.length,
      input.responses.length,
      qualityFlags.length,
    ),
  };
}

function qualityFlagsFor(
  validCount: number,
  lapseCount: number,
  total: number,
) {
  const flags: string[] = [];
  if (validCount < REACTION_TIME_TASK.qualityRules.minValidTrials) {
    flags.push("too_few_valid_trials");
  }
  if (
    total > 0 &&
    lapseCount / total > REACTION_TIME_TASK.qualityRules.maxLapseRate
  ) {
    flags.push("high_lapse_rate");
  }
  return flags;
}

function confidence(validCount: number, total: number, flagCount: number) {
  if (total === 0) return 0;
  if (validCount === 0) return 0;
  return Math.max(0.1, Math.min(1, validCount / total - flagCount * 0.15));
}

function isValidResponse(rtMs: number) {
  return (
    rtMs >= REACTION_TIME_TASK.qualityRules.anticipationMs &&
    rtMs <= REACTION_TIME_TASK.qualityRules.lapseMs
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[middle];
  return (values[middle - 1] + values[middle]) / 2;
}

function iqr(values: number[]) {
  if (values.length < 4) return 0;
  return (
    values[Math.floor(values.length * 0.75)] -
    values[Math.floor(values.length * 0.25)]
  );
}

function fatigueSlope(responses: Array<number | null>) {
  const valid = responses
    .filter((rtMs): rtMs is number => rtMs !== null)
    .filter(isValidResponse);
  if (valid.length < 2) return 0;
  return valid.at(-1)! - valid[0];
}
