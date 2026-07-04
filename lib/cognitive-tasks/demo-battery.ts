import type { JsonObject, JsonValue } from "@/lib/local";
import type { TaskDefinition } from "@/lib/test-engine";

import {
  ARROW_FOCUS_TASK,
  PAIR_LEARNING_TASK,
  REACTION_TIME_TASK,
  SEQUENCE_TAP_TASK,
  SEVEN_DAY_LEARNING_TASK,
  SYMBOL_MATCH_TASK,
} from "./definitions";
import {
  generateArrowFocusTrials,
  scoreArrowFocus,
  type ArrowDirection,
} from "./arrow-focus";
import { generatePairLearningPack, scorePairLearning } from "./pair-learning";
import {
  generateReactionTimeTrials,
  scoreReactionTimeSprint,
} from "./reaction-time";
import { generateSequenceTapTrials, scoreSequenceTap } from "./sequence-tap";
import {
  generateSevenDayLearningSchedule,
  scoreSevenDayLearning,
} from "./seven-day-learning";
import { generateSymbolMatchTrials, scoreSymbolMatch } from "./symbol-match";

export interface DemoTrialEvent {
  stimulus: JsonObject;
  expectedResponse: JsonValue;
  actualResponse: JsonValue;
  correct: boolean | null;
  stimulusOnsetTime: number;
  responseTime: number | null;
  rtMs: number | null;
  eventFlags: string[];
}

export interface DemoTaskResult {
  task: TaskDefinition;
  seed: string;
  stimulusPackId: string;
  summaryScore: JsonObject;
  qualityFlags: string[];
  confidence: number;
  events: DemoTrialEvent[];
}

const REACTION_DEMO_RESPONSES = [
  300, 350, 390, 400, 405, 410, 410, 410, 410, 410, 415, 420, 430, 440, 450,
  470,
];

export function buildFullDemoBattery(seedPrefix = "demo-full-battery") {
  return [
    reactionTimeResult(`${seedPrefix}-reaction`),
    symbolMatchResult(`${seedPrefix}-symbol`),
    arrowFocusResult(`${seedPrefix}-arrow`),
    sequenceTapResult(`${seedPrefix}-sequence`),
    pairLearningResult(`${seedPrefix}-pair`),
    sevenDayLearningResult(`${seedPrefix}-learning`),
  ];
}

function reactionTimeResult(seed: string): DemoTaskResult {
  const score = scoreReactionTimeSprint({
    seed,
    responses: REACTION_DEMO_RESPONSES,
  });
  const trials = generateReactionTimeTrials(
    seed,
    REACTION_DEMO_RESPONSES.length,
  );
  return {
    task: REACTION_TIME_TASK,
    seed,
    stimulusPackId: "reaction_time_sprint_v1",
    summaryScore: score.metrics,
    qualityFlags: score.qualityFlags,
    confidence: score.confidence,
    events: trials.map((trial, index) => reactionEvent(trial.delayMs, index)),
  };
}

function symbolMatchResult(seed: string): DemoTaskResult {
  const trials = generateSymbolMatchTrials(seed, 12);
  const responses = trials.map((trial, index) => ({
    trialId: trial.trialId,
    selectedSymbol:
      index === 0
        ? trial.choices.find((choice) => choice !== trial.correctSymbol)!
        : trial.correctSymbol,
    rtMs: 650 + index * 12,
  }));
  return {
    task: SYMBOL_MATCH_TASK,
    seed,
    stimulusPackId: "symbol_match_v1",
    summaryScore: scoreSymbolMatch(trials, responses).metrics,
    qualityFlags: [],
    confidence: 0.95,
    events: trials.map((trial, index) => ({
      stimulus: {
        targetSymbol: trial.targetSymbol,
        choices: trial.choices,
      },
      expectedResponse: trial.correctSymbol,
      actualResponse: responses[index].selectedSymbol,
      correct: responses[index].selectedSymbol === trial.correctSymbol,
      stimulusOnsetTime: index * 1500,
      responseTime: index * 1500 + responses[index].rtMs,
      rtMs: responses[index].rtMs,
      eventFlags: [],
    })),
  };
}

function arrowFocusResult(seed: string): DemoTaskResult {
  const trials = generateArrowFocusTrials(seed, 12);
  const responses = trials.map((trial) => ({
    trialId: trial.trialId,
    direction: trial.targetDirection,
    rtMs: trial.congruency === "congruent" ? 420 : 560,
  }));
  return {
    task: ARROW_FOCUS_TASK,
    seed,
    stimulusPackId: "arrow_focus_v1",
    summaryScore: scoreArrowFocus(trials, responses).metrics,
    qualityFlags: [],
    confidence: 0.9,
    events: trials.map((trial, index) =>
      arrowEvent(trial.targetDirection, responses[index].rtMs, index),
    ),
  };
}

function sequenceTapResult(seed: string): DemoTaskResult {
  const trials = generateSequenceTapTrials(seed, 4);
  const responses = [
    { trialId: trials[0].trialId, sequence: trials[0].sequence },
    { trialId: trials[1].trialId, sequence: trials[1].sequence },
    { trialId: trials[2].trialId, sequence: trials[2].sequence },
    { trialId: trials[3].trialId, sequence: [], missed: true },
  ];
  return {
    task: SEQUENCE_TAP_TASK,
    seed,
    stimulusPackId: "sequence_tap_v1",
    summaryScore: scoreSequenceTap(trials, responses).metrics,
    qualityFlags: ["explicit_missed_response"],
    confidence: 0.9,
    events: trials.map((trial, index) => ({
      stimulus: { sequence: trial.sequence, spanLength: trial.spanLength },
      expectedResponse: trial.sequence,
      actualResponse: responses[index].missed
        ? null
        : responses[index].sequence,
      correct: !responses[index].missed,
      stimulusOnsetTime: index * 3000,
      responseTime: responses[index].missed ? null : index * 3000 + 1800,
      rtMs: responses[index].missed ? null : 1800,
      eventFlags: responses[index].missed ? ["missed_response"] : [],
    })),
  };
}

function pairLearningResult(seed: string): DemoTaskResult {
  const pack = generatePairLearningPack(seed, 4);
  const responses = {
    immediate: [pack.pairs[0].target, pack.pairs[1].target],
    delayed: [pack.pairs[0].target],
    recognition: pack.pairs.map((pair) => pair.target),
    repeatedErrors: 1,
  };
  return {
    task: PAIR_LEARNING_TASK,
    seed,
    stimulusPackId: pack.packId,
    summaryScore: scorePairLearning(pack, responses).metrics,
    qualityFlags: [],
    confidence: 0.9,
    events: pack.pairs.map((pair, index) => ({
      stimulus: { cue: pair.cue, target: pair.target, phase: "learn" },
      expectedResponse: pair.target,
      actualResponse: responses.immediate[index] ?? null,
      correct: responses.immediate.includes(pair.target),
      stimulusOnsetTime: index * 4000,
      responseTime: index * 4000 + 2500,
      rtMs: 2500,
      eventFlags: [],
    })),
  };
}

function sevenDayLearningResult(seed: string): DemoTaskResult {
  const schedule = generateSevenDayLearningSchedule({
    month: "2026-07",
    seed,
    missedDays: [3],
  });
  const accuracies = [0.25, 0.5, null, 0.75, 0.8, 0.85, 0.9];
  return {
    task: SEVEN_DAY_LEARNING_TASK,
    seed,
    stimulusPackId: schedule.pack.packId,
    summaryScore: scoreSevenDayLearning(schedule, accuracies).metrics,
    qualityFlags: ["scheduled_missed_day"],
    confidence: 0.85,
    events: schedule.days.map((day, index) => ({
      stimulus: { day: day.day, packId: day.packId },
      expectedResponse: "daily_recall",
      actualResponse: accuracies[index],
      correct: accuracies[index] === null ? null : accuracies[index]! >= 0.5,
      stimulusOnsetTime: index * 24 * 60 * 60 * 1000,
      responseTime:
        accuracies[index] === null ? null : index * 24 * 60 * 60 * 1000,
      rtMs: null,
      eventFlags: day.missed ? ["missed_day"] : [],
    })),
  };
}

function reactionEvent(delayMs: number, index: number): DemoTrialEvent {
  const rtMs = REACTION_DEMO_RESPONSES[index];
  return {
    stimulus: { delayMs },
    expectedResponse: "any",
    actualResponse: "demo_response",
    correct: true,
    stimulusOnsetTime: index * 2000,
    responseTime: index * 2000 + rtMs,
    rtMs,
    eventFlags: [],
  };
}

function arrowEvent(
  direction: ArrowDirection,
  rtMs: number,
  index: number,
): DemoTrialEvent {
  return {
    stimulus: { targetDirection: direction },
    expectedResponse: direction,
    actualResponse: direction,
    correct: true,
    stimulusOnsetTime: index * 1600,
    responseTime: index * 1600 + rtMs,
    rtMs,
    eventFlags: [],
  };
}
