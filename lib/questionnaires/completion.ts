import type { QuestionnaireAnswerRecord } from "@/lib/local/schema";

import { latestQuestionnaireAnswers } from "./answers";
import type {
  QuestionnaireCompletionSection,
  QuestionnaireDefinition,
  ResearchProfileCompletionState,
} from "./types";

export function buildResearchProfileCompletionState(input: {
  questionnaires: readonly QuestionnaireDefinition[];
  answers: QuestionnaireAnswerRecord[];
}): ResearchProfileCompletionState {
  const latest = latestQuestionnaireAnswers(input.answers);
  const sections = Object.fromEntries(
    input.questionnaires.map((questionnaire) => [
      questionnaire.questionnaireId,
      sectionCompletion(questionnaire, latest),
    ]),
  );
  const values = Object.values(sections);
  const completeSections = values.filter(
    (section) => section.status === "complete",
  ).length;
  return {
    overall: {
      status: overallStatus(completeSections, values.length),
      completeSections,
      totalSections: values.length,
    },
    sections,
  };
}

function sectionCompletion(
  questionnaire: QuestionnaireDefinition,
  latest: ReturnType<typeof latestQuestionnaireAnswers>,
): QuestionnaireCompletionSection {
  const required = questionnaire.questions.filter(
    (question) => question.requiredness === "required",
  );
  const requiredAnswered = required.filter((question) =>
    hasCurrentAnswer(questionnaire, question.questionId, latest),
  );
  const optionalAnswered = questionnaire.questions.filter(
    (question) =>
      question.requiredness === "optional" &&
      hasCurrentAnswer(questionnaire, question.questionId, latest),
  );
  const missingRequired = required
    .filter(
      (question) =>
        !hasCurrentAnswer(questionnaire, question.questionId, latest),
    )
    .map((question) => question.questionId);
  return {
    questionnaireId: questionnaire.questionnaireId,
    version: questionnaire.version,
    title: questionnaire.title,
    status: sectionStatus(
      requiredAnswered.length,
      required.length,
      optionalAnswered.length,
    ),
    requiredTotal: required.length,
    requiredAnswered: requiredAnswered.length,
    optionalAnswered: optionalAnswered.length,
    missingRequired,
  };
}

function hasCurrentAnswer(
  questionnaire: QuestionnaireDefinition,
  questionId: string,
  latest: ReturnType<typeof latestQuestionnaireAnswers>,
) {
  const answer = latest.get(
    `${questionnaire.questionnaireId}:${questionId}:null`,
  );
  return (
    answer?.questionnaireVersion === questionnaire.version &&
    answer.answerStatus !== "skipped"
  );
}

function sectionStatus(
  requiredAnswered: number,
  requiredTotal: number,
  optionalAnswered: number,
) {
  if (requiredAnswered === requiredTotal) return "complete";
  if (requiredAnswered > 0 || optionalAnswered > 0) return "in_progress";
  return "not_started";
}

function overallStatus(completeSections: number, totalSections: number) {
  if (completeSections === totalSections) return "complete";
  if (completeSections > 0) return "in_progress";
  return "not_started";
}
