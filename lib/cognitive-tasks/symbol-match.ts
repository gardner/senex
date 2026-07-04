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
  const rts = responses
    .map((response) => response.rtMs)
    .toSorted((a, b) => a - b);
  return {
    taskId: SYMBOL_MATCH_TASK.taskId,
    metrics: {
      correct_count: correct,
      accuracy: trials.length === 0 ? 0 : correct / trials.length,
      median_rt_ms: rts[Math.floor(rts.length / 2)] ?? 0,
      valid_trial_count: responses.length,
    },
  };
}
