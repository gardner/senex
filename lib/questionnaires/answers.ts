import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type QuestionnaireAnswerRecord,
} from "@/lib/local/schema";

import type { CreateQuestionnaireAnswerInput, LatestAnswerMap } from "./types";

export function createQuestionnaireAnswerRecord(
  input: CreateQuestionnaireAnswerInput,
): QuestionnaireAnswerRecord {
  const status = answerStatus(input.value);
  return {
    answerId:
      input.answerId ??
      `answer_${input.questionnaire.questionnaireId}_${input.profileId}_${input.question.questionId}_${compactTime(input.answeredAt)}_${crypto.randomUUID()}`,
    profileId: input.profileId,
    sessionId: input.sessionId,
    questionnaireId: input.questionnaire.questionnaireId,
    questionnaireVersion: input.questionnaire.version,
    questionId: input.question.questionId,
    questionVersion: input.question.version,
    answerValue: input.value ?? null,
    answerStatus: status,
    answeredAt: input.answeredAt,
    sourceScreen: input.sourceScreen,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

export function latestQuestionnaireAnswers(
  answers: QuestionnaireAnswerRecord[],
): LatestAnswerMap {
  const latest: LatestAnswerMap = new Map();
  for (const answer of answers.toSorted(compareAnswers)) {
    latest.set(answerKey(answer), answer);
  }
  return latest;
}

export function answerKey(answer: QuestionnaireAnswerRecord) {
  return `${answer.questionnaireId}:${answer.questionId}:${answer.sessionId ?? "null"}`;
}

function answerStatus(value: CreateQuestionnaireAnswerInput["value"]) {
  if (value === undefined || value === null || value === "") return "skipped";
  if (Array.isArray(value)) {
    if (value.length === 0) return "skipped";
    if (value.includes("prefer_not_to_say")) {
      if (value.length > 1) {
        throw new Error("Prefer not to say cannot be combined with answers.");
      }
      return "prefer_not_to_say";
    }
  }
  if (value === "prefer_not_to_say" || value === "prefer_not_to_answer") {
    return "prefer_not_to_say";
  }
  return "answered";
}

function compareAnswers(
  left: QuestionnaireAnswerRecord,
  right: QuestionnaireAnswerRecord,
) {
  const byTime = left.answeredAt.localeCompare(right.answeredAt);
  if (byTime !== 0) return byTime;
  return left.answerId.localeCompare(right.answerId);
}

function compactTime(value: string) {
  return value.replaceAll(/[^0-9A-Za-z]/g, "");
}
