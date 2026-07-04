"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createQuestionnaireAnswerRecord,
  type QuestionnaireDefinition,
  type QuestionnaireQuestion,
} from "@/lib/questionnaires";
import {
  getOrCreateLocalProfile,
  saveQuestionnaireAnswer,
  type JsonValue,
  type QuestionnaireAnswerRecord,
} from "@/lib/local";

import { QuestionField } from "./question-controls";

type AnswerDraft = Record<string, JsonValue | undefined>;
type AnswerErrors = Record<string, string>;

export function QuestionnaireForm({
  questionnaire,
  sessionId,
  sourceScreen,
  submitLabel,
  disabled,
  resolveSessionId,
  onSaved,
}: {
  questionnaire: QuestionnaireDefinition;
  sessionId: string | null;
  sourceScreen: string;
  submitLabel: string;
  disabled: boolean;
  resolveSessionId?: () => Promise<string | null>;
  onSaved: (answers: QuestionnaireAnswerRecord[]) => void;
}) {
  const [draft, setDraft] = useState<AnswerDraft>(() =>
    Object.fromEntries(
      questionnaire.questions.map((question) => [
        question.questionId,
        defaultValue(question),
      ]),
    ),
  );
  const [errors, setErrors] = useState<AnswerErrors>({});

  async function handleSubmit() {
    const nextErrors = validationErrors(questionnaire.questions, draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    const profile = await getOrCreateLocalProfile();
    const answeredAt = new Date().toISOString();
    const nextSessionId = resolveSessionId
      ? await resolveSessionId()
      : sessionId;
    const answers = questionnaire.questions.map((question) =>
      createQuestionnaireAnswerRecord({
        profileId: profile.profileId,
        sessionId: nextSessionId,
        questionnaire,
        question,
        value: draft[question.questionId],
        answeredAt,
        sourceScreen,
      }),
    );
    await Promise.all(answers.map(saveQuestionnaireAnswer));
    onSaved(answers);
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">{questionnaire.title}</h3>
        <p className="text-muted-foreground">{questionnaire.purpose}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {questionnaire.questions.map((question) => (
          <QuestionField
            key={question.questionId}
            question={question}
            value={draft[question.questionId]}
            error={errors[question.questionId]}
            disabled={disabled}
            onChange={(value) => {
              setDraft((current) => ({
                ...current,
                [question.questionId]: value,
              }));
              setErrors((current) =>
                withoutError(current, question.questionId),
              );
            }}
          />
        ))}
      </div>
      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={disabled}
      >
        {submitLabel}
      </Button>
    </section>
  );
}

function defaultValue(question: QuestionnaireQuestion): JsonValue | undefined {
  if (question.type === "multi_choice") return [];
  if (question.allowsPreferNotToSay && question.type === "single_choice") {
    return "prefer_not_to_say";
  }
  return undefined;
}

function validationErrors(
  questions: QuestionnaireQuestion[],
  draft: AnswerDraft,
): AnswerErrors {
  return Object.fromEntries(
    questions
      .filter(
        (question) =>
          question.requiredness === "required" &&
          isSkippedValue(draft[question.questionId]),
      )
      .map((question) => [
        question.questionId,
        `${question.label} is required.`,
      ]),
  );
}

function isSkippedValue(value: JsonValue | undefined) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function withoutError(errors: AnswerErrors, questionId: string) {
  const next = { ...errors };
  delete next[questionId];
  return next;
}
