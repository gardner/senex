import type { QuestionnaireAnswerRecord } from "@/lib/local/schema";

export function buildSessionContextQualityFlags(
  answers: QuestionnaireAnswerRecord[],
) {
  const flags = new Set<string>();
  for (const answer of answers) {
    if (answer.questionId === "sleep_quality_last_night") {
      addWhen(
        flags,
        answer.answerValue === "very_poor",
        "self_reported_poor_sleep",
      );
    }
    if (answer.questionId === "stress_today") {
      addWhen(
        flags,
        Number(answer.answerValue) >= 4,
        "self_reported_high_stress",
      );
    }
    if (answer.questionId === "illness_today") {
      addWhen(flags, answer.answerValue === "yes", "self_reported_illness");
    }
    if (answer.questionId === "substances_24h") {
      addWhen(
        flags,
        Array.isArray(answer.answerValue) &&
          answer.answerValue.includes("sedating_medicine"),
        "self_reported_sedating_substance",
      );
    }
    if (answer.questionId === "distractions_during_test") {
      addWhen(
        flags,
        Number(answer.answerValue) >= 4,
        "self_reported_distraction",
      );
    }
  }
  return Array.from(flags);
}

function addWhen(flags: Set<string>, condition: boolean, flag: string) {
  if (condition) flags.add(flag);
}
