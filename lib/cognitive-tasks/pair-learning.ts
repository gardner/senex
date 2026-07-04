import { PAIR_LEARNING_TASK } from "./definitions";
import { createSeededRandom, shuffle } from "./random";

const CUES = ["river", "lantern", "garden", "harbor", "planet", "camera"];
const TARGETS = ["violet", "anchor", "silver", "forest", "comet", "window"];

export interface PairLearningPack {
  packId: string;
  packVersion: string;
  pairs: Array<{ cue: string; target: string }>;
}

export function generatePairLearningPack(
  seed: string,
  count = 6,
): PairLearningPack {
  const random = createSeededRandom(seed);
  const cues = shuffle(CUES, random).slice(0, count);
  const targets = shuffle(TARGETS, random).slice(0, count);
  return {
    packId: `pair_pack_${seed}`,
    packVersion: "1.0.0",
    pairs: cues.map((cue, index) => ({ cue, target: targets[index] })),
  };
}

export function scorePairLearning(
  pack: PairLearningPack,
  responses: {
    immediate: string[];
    delayed: string[];
    recognition: string[];
    repeatedErrors: number;
  },
) {
  const targets = pack.pairs.map((pair) => pair.target);
  const immediate = accuracy(targets, responses.immediate);
  const delayed = accuracy(targets, responses.delayed);
  const recognition = accuracy(targets, responses.recognition);
  return {
    taskId: PAIR_LEARNING_TASK.taskId,
    metrics: {
      immediate_accuracy: immediate,
      delayed_accuracy: delayed,
      recognition_accuracy: recognition,
      repeated_errors: responses.repeatedErrors,
      learning_slope: recognition - immediate,
      forgetting_delta: immediate - delayed,
    },
  };
}

function accuracy(expected: string[], actual: string[]) {
  if (expected.length === 0) return 0;
  const correct = expected.filter((target) => actual.includes(target)).length;
  return correct / expected.length;
}
