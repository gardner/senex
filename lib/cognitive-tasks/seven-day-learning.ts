import { SEVEN_DAY_LEARNING_TASK } from "./definitions";
import {
  generatePairLearningPack,
  type PairLearningPack,
} from "./pair-learning";

export interface SevenDayLearningSchedule {
  month: string;
  seed: string;
  pack: PairLearningPack;
  days: Array<{ day: number; packId: string; missed: boolean }>;
}

export function generateSevenDayLearningSchedule(input: {
  month: string;
  seed: string;
  missedDays?: number[];
}): SevenDayLearningSchedule {
  const missed = new Set(input.missedDays ?? []);
  const pack = generatePairLearningPack(`${input.month}-${input.seed}`, 6);
  return {
    month: input.month,
    seed: input.seed,
    pack,
    days: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      packId: pack.packId,
      missed: missed.has(index + 1),
    })),
  };
}

export function scoreSevenDayLearning(
  schedule: SevenDayLearningSchedule,
  accuracies: Array<number | null>,
) {
  const completed = accuracies.filter(
    (value): value is number => value !== null,
  );
  const first = completed[0] ?? 0;
  const last = completed.at(-1) ?? 0;
  return {
    taskId: SEVEN_DAY_LEARNING_TASK.taskId,
    metrics: {
      completed_days: completed.length,
      missed_days: schedule.days.filter((day) => day.missed).length,
      learning_slope: completed.length > 1 ? last - first : 0,
      retention: last,
    },
  };
}
