import { ARROW_FOCUS_TASK } from "./definitions";
import { createSeededRandom, shuffle } from "./random";

export type ArrowDirection = "left" | "right";

export interface ArrowFocusTrial {
  trialId: string;
  targetDirection: ArrowDirection;
  flankerDirection: ArrowDirection;
  congruency: "congruent" | "incongruent";
}

export function generateArrowFocusTrials(
  seed: string,
  count = ARROW_FOCUS_TASK.stimulus.trialCount,
): ArrowFocusTrial[] {
  const random = createSeededRandom(seed);
  const half = Math.floor(count / 2);
  const congruencies = [
    ...Array.from({ length: half }, () => "congruent" as const),
    ...Array.from({ length: count - half }, () => "incongruent" as const),
  ];
  return shuffle(congruencies, random).map((congruency, index) => {
    const targetDirection = random() < 0.5 ? "left" : "right";
    return {
      trialId: `arrow_${seed}_${index}`,
      targetDirection,
      flankerDirection:
        congruency === "congruent"
          ? targetDirection
          : opposite(targetDirection),
      congruency,
    };
  });
}

export function scoreArrowFocus(
  trials: ArrowFocusTrial[],
  responses: Array<{
    trialId: string;
    direction: ArrowDirection;
    rtMs: number;
  }>,
) {
  const byId = new Map(
    responses.map((response) => [response.trialId, response]),
  );
  const correctTrials = trials.filter(
    (trial) => byId.get(trial.trialId)?.direction === trial.targetDirection,
  );
  const congruentRt = meanRt(trials, responses, "congruent");
  const incongruentRt = meanRt(trials, responses, "incongruent");
  return {
    taskId: ARROW_FOCUS_TASK.taskId,
    metrics: {
      accuracy: trials.length === 0 ? 0 : correctTrials.length / trials.length,
      median_rt_ms: median(responses.map((response) => response.rtMs)),
      conflict_cost_ms: incongruentRt - congruentRt,
      valid_trial_count: responses.length,
    },
  };
}

function opposite(direction: ArrowDirection): ArrowDirection {
  return direction === "left" ? "right" : "left";
}

function meanRt(
  trials: ArrowFocusTrial[],
  responses: Array<{ trialId: string; rtMs: number }>,
  congruency: ArrowFocusTrial["congruency"],
) {
  const ids = new Set(
    trials
      .filter((trial) => trial.congruency === congruency)
      .map((trial) => trial.trialId),
  );
  const rts = responses
    .filter((response) => ids.has(response.trialId))
    .map((response) => response.rtMs);
  if (rts.length === 0) return 0;
  return rts.reduce((sum, rtMs) => sum + rtMs, 0) / rts.length;
}

function median(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
