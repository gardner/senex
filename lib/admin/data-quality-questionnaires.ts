import type { AnonymousReportingPayload } from "@/lib/anonymous-reporting";
import { P0_RESEARCH_PROFILE_QUESTIONNAIRES } from "@/lib/questionnaires/definitions";

export function buildMissingQuestionnaireFields(
  payloads: AnonymousReportingPayload[],
) {
  const byField = new Map(
    requiredReportingFields().map((field) => [field.key, { ...field }]),
  );
  for (const payload of payloads) {
    const answers = questionnaireAnswerSet(payload);
    for (const field of byField.values()) {
      if (!payload.includedCategories.includes(field.category)) continue;
      field.expectedCount += 1;
      if (answers.has(field.key)) field.answeredCount += 1;
    }
  }
  return [...byField.values()]
    .map((field) => ({
      questionnaireId: field.questionnaireId,
      questionId: field.questionId,
      label: field.label,
      expectedCount: field.expectedCount,
      answeredCount: field.answeredCount,
      missingCount: field.expectedCount - field.answeredCount,
      completionRate: rate(field.answeredCount, field.expectedCount),
    }))
    .filter((field) => field.expectedCount > 0 && field.missingCount > 0)
    .sort(byCountDescThenName("missingCount", "label"));
}

function requiredReportingFields() {
  return P0_RESEARCH_PROFILE_QUESTIONNAIRES.flatMap((questionnaire) =>
    questionnaire.questions
      .filter((question) => question.requiredForReporting)
      .map((question) => ({
        key: `${questionnaire.questionnaireId}:${question.questionId}`,
        category:
          questionnaire.questionnaireId === "demographics_v1"
            ? ("share_demographics" as const)
            : ("share_questionnaires" as const),
        questionnaireId: questionnaire.questionnaireId,
        questionId: question.questionId,
        label: question.label,
        expectedCount: 0,
        answeredCount: 0,
      })),
  );
}

function questionnaireAnswerSet(payload: AnonymousReportingPayload) {
  const answers = [
    ...(payload.data.demographics ?? []),
    ...(payload.data.questionnaireAnswers ?? []),
  ];
  return new Set(
    answers
      .filter((answer) => answer.answerStatus !== "skipped")
      .map((answer) => `${answer.questionnaireId}:${answer.questionId}`),
  );
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}

function byCountDescThenName<T extends Record<string, string | number>>(
  countKey: keyof T,
  nameKey: keyof T,
) {
  return (left: T, right: T) => {
    const byCount = Number(right[countKey]) - Number(left[countKey]);
    if (byCount !== 0) return byCount;
    return String(left[nameKey]).localeCompare(String(right[nameKey]));
  };
}
