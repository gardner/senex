import { SYMBOL_MATCH_TASK } from "./definitions";
import { createSeededRandom, pick, shuffle } from "./random";

const SYMBOLS = ["@", "#", "%", "&", "+", "=", "?", "~"];

export interface SymbolMatchTrial {
  trialId: string;
  targetSymbol: string;
  choices: string[];
  correctSymbol: string;
}

export function generateSymbolMatchTrials(
  seed: string,
  count = SYMBOL_MATCH_TASK.stimulus.trialCount,
): SymbolMatchTrial[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const correctSymbol = pick(SYMBOLS, random);
    const distractors = shuffle(
      SYMBOLS.filter((symbol) => symbol !== correctSymbol),
      random,
    ).slice(0, 3);
    return {
      trialId: `symbol_${seed}_${index}`,
      targetSymbol: correctSymbol,
      choices: shuffle([correctSymbol, ...distractors], random),
      correctSymbol,
    };
  });
}

export function scoreSymbolMatch(
  trials: SymbolMatchTrial[],
  responses: Array<{ trialId: string; selectedSymbol: string; rtMs: number }>,
) {
  const byId = new Map(
    responses.map((response) => [response.trialId, response]),
  );
  const correct = trials.filter(
    (trial) => byId.get(trial.trialId)?.selectedSymbol === trial.correctSymbol,
  ).length;
  const rts = responses.map((response) => response.rtMs);
  return {
    taskId: SYMBOL_MATCH_TASK.taskId,
    metrics: {
      correct_count: correct,
      accuracy: trials.length === 0 ? 0 : correct / trials.length,
      median_rt_ms: median(rts),
      valid_trial_count: responses.length,
    },
  };
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}
