import { SEQUENCE_TAP_TASK } from "./definitions";
import { createSeededRandom } from "./random";

export interface SequenceTapTrial {
  trialId: string;
  spanLength: number;
  sequence: number[];
}

export function generateSequenceTapTrials(
  seed: string,
  count = 5,
): SequenceTapTrial[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, (_, index) => ({
    trialId: `sequence_${seed}_${index}`,
    spanLength: index + 2,
    sequence: Array.from({ length: index + 2 }, () => Math.floor(random() * 9)),
  }));
}

export function scoreSequenceTap(
  trials: SequenceTapTrial[],
  responses: Array<{ trialId: string; sequence: number[]; missed?: boolean }>,
) {
  const byId = new Map(
    responses.map((response) => [response.trialId, response]),
  );
  let span = 0;
  let errorCount = 0;
  let missedCount = 0;
  for (const trial of trials) {
    const response = byId.get(trial.trialId);
    if (
      !response?.missed &&
      sequencesEqual(response?.sequence, trial.sequence)
    ) {
      span = Math.max(span, trial.spanLength);
      continue;
    }
    if (response?.missed) missedCount += 1;
    else errorCount += 1;
  }
  return {
    taskId: SEQUENCE_TAP_TASK.taskId,
    metrics: { span, error_count: errorCount, missed_count: missedCount },
  };
}

function sequencesEqual(left: number[] | undefined, right: number[]) {
  if (!left || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
