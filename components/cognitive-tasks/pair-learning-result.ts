import {
  PAIR_LEARNING_TASK,
  scorePairLearning,
  type DemoTaskResult,
  type PairLearningPack,
} from "@/lib/cognitive-tasks";

export const PAIR_LEARNING_SEED = "interactive-pair-learning-v1";
export const PAIR_COUNT = 3;
export const DELAY_DURATION_MS = 1000;

export type ResponsePhase = "immediate" | "delayed" | "recognition";
export type PairLearningPhase =
  | "idle"
  | "study"
  | "delay"
  | "saving"
  | "saved"
  | "error"
  | ResponsePhase;
export type InputMode = "pointer" | "touch";
export type PairLearningMetrics = ReturnType<
  typeof scorePairLearning
>["metrics"];

export type PairResponse = {
  phase: ResponsePhase;
  cue: string;
  expected: string;
  actual: string;
  inputMode: InputMode;
  startedAt: number;
  responseTime: number;
  rtMs: number;
};

export function scorePairLearningResponses(
  pack: PairLearningPack,
  responses: PairResponse[],
) {
  return scorePairLearning(pack, {
    immediate: responsesForPhase(responses, "immediate"),
    delayed: responsesForPhase(responses, "delayed"),
    recognition: responsesForPhase(responses, "recognition"),
    repeatedErrors: responses.filter(
      (response) => response.actual !== response.expected,
    ).length,
  }).metrics;
}

export function buildPairLearningResult(
  pack: PairLearningPack,
  responses: PairResponse[],
  metrics: PairLearningMetrics,
): DemoTaskResult {
  return {
    task: PAIR_LEARNING_TASK,
    seed: PAIR_LEARNING_SEED,
    stimulusPackId: pack.packId,
    summaryScore: metrics,
    qualityFlags: [],
    confidence: 0.9,
    events: responses.map((response) => ({
      stimulus: {
        cue: response.cue,
        target: response.expected,
        phase: response.phase,
        delayDurationMs:
          response.phase === "delayed" ? DELAY_DURATION_MS : null,
      },
      expectedResponse: response.expected,
      actualResponse: response.actual,
      correct: response.actual === response.expected,
      stimulusOnsetTime: response.startedAt,
      responseTime: response.responseTime,
      rtMs: response.rtMs,
      eventFlags: [`input_${response.inputMode}`, `phase_${response.phase}`],
    })),
  };
}

export function isResponsePhase(phase: string): phase is ResponsePhase {
  return (
    phase === "immediate" || phase === "delayed" || phase === "recognition"
  );
}

function responsesForPhase(responses: PairResponse[], phase: ResponsePhase) {
  return responses
    .filter((response) => response.phase === phase)
    .map((response) => response.actual);
}
