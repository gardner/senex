import {
  QUESTION_TYPES,
  type QuestionnaireDefinition,
  type QuestionnaireQuestion,
} from "./types";

export function assertQuestionnaireDefinition(
  value: unknown,
): asserts value is QuestionnaireDefinition {
  const definition = asRecord(value, "QuestionnaireDefinition");
  expectString(definition.questionnaireId, "questionnaireId");
  expectString(definition.version, "version");
  expectString(definition.title, "title");
  expectString(definition.purpose, "purpose");
  if (typeof definition.active !== "boolean")
    throw new Error("QuestionnaireDefinition.active must be a boolean");
  if (!Array.isArray(definition.questions) || definition.questions.length === 0)
    throw new Error("QuestionnaireDefinition.questions must not be empty");
  for (const question of definition.questions)
    assertQuestionnaireQuestion(question);
}

function assertQuestionnaireQuestion(
  value: unknown,
): asserts value is QuestionnaireQuestion {
  const question = asRecord(value, "QuestionnaireQuestion");
  expectString(question.questionId, "questionId");
  expectString(question.version, "version");
  expectString(question.label, "label");
  if (!QUESTION_TYPES.includes(question.type as never)) {
    throw new Error(`QuestionnaireQuestion.type is unsupported`);
  }
  if (!["required", "optional"].includes(String(question.requiredness))) {
    throw new Error("QuestionnaireQuestion.requiredness is unsupported");
  }
  for (const field of [
    "requiredForReporting",
    "requiredForTrialContact",
    "sensitive",
    "allowsPreferNotToSay",
  ]) {
    if (typeof question[field] !== "boolean")
      throw new Error(`QuestionnaireQuestion.${field} must be a boolean`);
  }
  expectString(question.researchPurpose, "researchPurpose");
  if (
    !["local_only", "anonymous_research", "trial_contact"].includes(
      String(question.answerVisibility),
    )
  ) {
    throw new Error("QuestionnaireQuestion.answerVisibility is unsupported");
  }
  if (["single_choice", "multi_choice"].includes(String(question.type))) {
    if (!Array.isArray(question.options) || question.options.length === 0)
      throw new Error("QuestionnaireQuestion.options must not be empty");
  }
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, field: string) {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`${field} must be a non-empty string`);
}
