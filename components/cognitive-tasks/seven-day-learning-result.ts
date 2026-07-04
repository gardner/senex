import {
  SEVEN_DAY_LEARNING_TASK,
  generateSevenDayLearningSchedule,
  scoreSevenDayLearning,
  type DemoTaskResult,
  type SevenDayLearningSchedule,
} from "@/lib/cognitive-tasks";

export const SEVEN_DAY_LEARNING_SEED = "interactive-seven-day-learning-v1";
export const SEVEN_DAY_LEARNING_MONTH = "2026-07";
export const SEVEN_DAY_COUNT = 7;

export type SevenDayPhase = "idle" | "running" | "saving" | "saved" | "error";
export type SevenDayInputMode = "pointer" | "touch";
export type SevenDayMetrics = ReturnType<
  typeof scoreSevenDayLearning
>["metrics"];

export type SevenDayResponse = {
  day: number;
  cue: string;
  expected: string;
  actual: string | null;
  missed: boolean;
  inputMode: SevenDayInputMode | null;
  startedAt: number;
  responseTime: number | null;
  rtMs: number | null;
};
type SevenDayScheduleDay = SevenDayLearningSchedule["days"][number];

export function buildSevenDaySchedule(missedDays: number[] = []) {
  return generateSevenDayLearningSchedule({
    month: SEVEN_DAY_LEARNING_MONTH,
    seed: SEVEN_DAY_LEARNING_SEED,
    missedDays,
  });
}

export function scoreSevenDayResponses(
  schedule: SevenDayLearningSchedule,
  responses: SevenDayResponse[],
) {
  return scoreSevenDayLearning(
    schedule,
    schedule.days.map((day) => accuracyForDay(responses, day.day)),
  ).metrics;
}

export function buildSevenDayLearningResult(
  schedule: SevenDayLearningSchedule,
  responses: SevenDayResponse[],
  metrics: SevenDayMetrics,
): DemoTaskResult {
  const missedDays = new Set(
    responses
      .filter((response) => response.missed)
      .map((response) => response.day),
  );
  return {
    task: SEVEN_DAY_LEARNING_TASK,
    seed: SEVEN_DAY_LEARNING_SEED,
    stimulusPackId: schedule.pack.packId,
    summaryScore: metrics,
    qualityFlags: missedDays.size > 0 ? ["scheduled_missed_day"] : [],
    confidence: missedDays.size > 0 ? 0.85 : 0.9,
    events: schedule.days.map((day, index) =>
      eventForDay(
        day,
        index,
        schedule.month,
        missedDays,
        responses.find((entry) => entry.day === day.day),
      ),
    ),
  };
}

function eventForDay(
  day: SevenDayScheduleDay,
  index: number,
  month: string,
  missedDays: Set<number>,
  response: SevenDayResponse | undefined,
) {
  if (!response) return missingEventForDay(day, index, month, missedDays);
  return {
    stimulus: {
      day: day.day,
      month,
      packId: day.packId,
      cue: response.cue,
      target: response.expected,
      missed: missedDays.has(day.day),
    },
    expectedResponse: response.expected,
    actualResponse: response.actual,
    correct: responseCorrect(response),
    stimulusOnsetTime: response.startedAt,
    responseTime: response.responseTime,
    rtMs: response.rtMs,
    eventFlags: eventFlagsForResponse(response),
  };
}

function missingEventForDay(
  day: SevenDayScheduleDay,
  index: number,
  month: string,
  missedDays: Set<number>,
) {
  return {
    stimulus: {
      day: day.day,
      month,
      packId: day.packId,
      cue: null,
      target: null,
      missed: missedDays.has(day.day),
    },
    expectedResponse: "daily_recall",
    actualResponse: null,
    correct: null,
    stimulusOnsetTime: index * dayMs(),
    responseTime: null,
    rtMs: null,
    eventFlags: ["missing_day"],
  };
}

function accuracyForDay(responses: SevenDayResponse[], day: number) {
  const response = responses.find((entry) => entry.day === day);
  if (!response || response.missed) return null;
  return response.actual === response.expected ? 1 : 0;
}

function responseCorrect(response: SevenDayResponse) {
  if (response.missed) return null;
  return response.actual === response.expected;
}

function eventFlagsForResponse(response: SevenDayResponse) {
  if (response.missed) return ["missed_day"];
  return response.inputMode ? [`input_${response.inputMode}`] : [];
}

function dayMs() {
  return 24 * 60 * 60 * 1000;
}
