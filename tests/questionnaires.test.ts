import { describe, expect, it } from "vitest";

import {
  DEMOGRAPHICS_QUESTIONNAIRE,
  P0_RESEARCH_PROFILE_QUESTIONNAIRES,
  SESSION_CONTEXT_QUESTIONNAIRE,
  assertQuestionnaireDefinition,
  buildResearchProfileCompletionState,
  buildSessionContextQualityFlags,
  createQuestionnaireAnswerRecord,
  latestQuestionnaireAnswers,
} from "@/lib/questionnaires";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  assertQuestionnaireAnswerRecord,
  type JsonValue,
  type QuestionnaireAnswerRecord,
} from "@/lib/local/schema";

const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";
const profileId = "profile_questionnaire";

describe("questionnaire definitions", () => {
  it("validates versioned questionnaire metadata and every supported question type", () => {
    expect(() =>
      assertQuestionnaireDefinition(DEMOGRAPHICS_QUESTIONNAIRE),
    ).not.toThrow();
    expect(() =>
      assertQuestionnaireDefinition(SESSION_CONTEXT_QUESTIONNAIRE),
    ).not.toThrow();

    expect(
      DEMOGRAPHICS_QUESTIONNAIRE.questions.map((question) => question.type),
    ).toEqual(
      expect.arrayContaining([
        "single_choice",
        "multi_choice",
        "number",
        "text_short",
        "scale",
        "date_or_year",
      ]),
    );
    expect(
      DEMOGRAPHICS_QUESTIONNAIRE.questions.every(
        (question) =>
          !question.sensitive ||
          question.allowsPreferNotToSay ||
          question.requiredness === "optional",
      ),
    ).toBe(true);
    expect(
      DEMOGRAPHICS_QUESTIONNAIRE.questions.find(
        (question) => question.questionId === "ethnicity",
      ),
    ).toMatchObject({
      type: "multi_choice",
      sensitive: true,
      allowsPreferNotToSay: true,
      answerVisibility: "anonymous_research",
    });
  });

  it("rejects malformed questionnaire definitions loudly", () => {
    expect(() =>
      assertQuestionnaireDefinition({
        ...DEMOGRAPHICS_QUESTIONNAIRE,
        version: "",
      }),
    ).toThrow(/version/);

    expect(() =>
      assertQuestionnaireDefinition({
        ...DEMOGRAPHICS_QUESTIONNAIRE,
        questions: [
          {
            ...DEMOGRAPHICS_QUESTIONNAIRE.questions.find(
              (question) => question.type === "single_choice",
            )!,
            options: [],
          },
        ],
      }),
    ).toThrow(/options/);
  });
});

describe("questionnaire answer records", () => {
  it("creates versioned answer records and keeps prefer-not-to-say first-class", () => {
    const question = DEMOGRAPHICS_QUESTIONNAIRE.questions.find(
      (item) => item.questionId === "ethnicity",
    )!;
    const answer = createQuestionnaireAnswerRecord({
      profileId,
      sessionId: null,
      questionnaire: DEMOGRAPHICS_QUESTIONNAIRE,
      question,
      value: "prefer_not_to_say",
      answeredAt: now,
      sourceScreen: "research_questionnaires",
    });

    expect(answer).toMatchObject({
      profileId,
      sessionId: null,
      questionnaireId: "demographics_v1",
      questionnaireVersion: DEMOGRAPHICS_QUESTIONNAIRE.version,
      questionId: "ethnicity",
      questionVersion: question.version,
      answerValue: "prefer_not_to_say",
      answerStatus: "prefer_not_to_say",
      sourceScreen: "research_questionnaires",
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    });
    expect(answer.answerId).toContain("demographics_v1");
    expect(() => assertQuestionnaireAnswerRecord(answer)).not.toThrow();
  });

  it("rejects mixed prefer-not-to-say and material answers", () => {
    const question = DEMOGRAPHICS_QUESTIONNAIRE.questions.find(
      (item) => item.questionId === "ethnicity",
    )!;

    expect(() =>
      createQuestionnaireAnswerRecord({
        profileId,
        sessionId: null,
        questionnaire: DEMOGRAPHICS_QUESTIONNAIRE,
        question,
        value: ["prefer_not_to_say", "maori"],
        answeredAt: now,
        sourceScreen: "research_questionnaires",
      }),
    ).toThrow(/Prefer not to say/);
  });

  it("treats empty multi-choice answers as skipped", () => {
    const question = DEMOGRAPHICS_QUESTIONNAIRE.questions.find(
      (item) => item.questionId === "ethnicity",
    )!;

    expect(
      createQuestionnaireAnswerRecord({
        profileId,
        sessionId: null,
        questionnaire: DEMOGRAPHICS_QUESTIONNAIRE,
        question,
        value: [],
        answeredAt: now,
        sourceScreen: "research_questionnaires",
      }).answerStatus,
    ).toBe("skipped");
  });

  it("preserves answer history and derives latest answers by questionnaire version", () => {
    const question = DEMOGRAPHICS_QUESTIONNAIRE.questions.find(
      (item) => item.questionId === "primary_language",
    )!;
    const first = createQuestionnaireAnswerRecord({
      profileId,
      sessionId: null,
      questionnaire: DEMOGRAPHICS_QUESTIONNAIRE,
      question,
      value: "English",
      answeredAt: now,
      sourceScreen: "research_questionnaires",
      answerId: "answer_first",
    });
    const second = createQuestionnaireAnswerRecord({
      profileId,
      sessionId: null,
      questionnaire: DEMOGRAPHICS_QUESTIONNAIRE,
      question,
      value: "Te reo Maori",
      answeredAt: later,
      sourceScreen: "research_questionnaires",
      answerId: "answer_second",
    });

    const latest = latestQuestionnaireAnswers([first, second]);
    expect(first.answerId).not.toBe(second.answerId);
    expect(latest.get("demographics_v1:primary_language:null")).toBe(second);
  });
});

describe("research profile completion", () => {
  it("is version-aware and treats missing optional fields as incomplete-but-not-errors", () => {
    const answers = requiredAnswersFor(DEMOGRAPHICS_QUESTIONNAIRE);
    const completion = buildResearchProfileCompletionState({
      questionnaires: P0_RESEARCH_PROFILE_QUESTIONNAIRES,
      answers,
    });

    expect(completion.sections.demographics_v1).toMatchObject({
      status: "complete",
      requiredAnswered: expect.any(Number),
      missingRequired: [],
    });
    expect(completion.sections.general_health_context_v1.status).toBe(
      "not_started",
    );
    expect(completion.overall.status).toBe("in_progress");

    const oldVersionAnswers = answers.map((answer) => ({
      ...answer,
      questionnaireVersion: "old-version",
    }));
    expect(
      buildResearchProfileCompletionState({
        questionnaires: [DEMOGRAPHICS_QUESTIONNAIRE],
        answers: oldVersionAnswers,
      }).sections.demographics_v1.status,
    ).toBe("not_started");
  });

  it("derives conservative session quality flags from session context answers", () => {
    const flags = buildSessionContextQualityFlags([
      contextAnswer("sleep_quality_last_night", "very_poor"),
      contextAnswer("stress_today", 5),
      contextAnswer("illness_today", "yes"),
      contextAnswer("substances_24h", ["sedating_medicine"]),
      contextAnswer("distractions_during_test", 4),
    ]);

    expect(flags).toEqual([
      "self_reported_poor_sleep",
      "self_reported_high_stress",
      "self_reported_illness",
      "self_reported_sedating_substance",
      "self_reported_distraction",
    ]);
  });
});

function requiredAnswersFor(
  questionnaire: typeof DEMOGRAPHICS_QUESTIONNAIRE,
): QuestionnaireAnswerRecord[] {
  return questionnaire.questions
    .filter((question) => question.requiredness === "required")
    .map((question) =>
      createQuestionnaireAnswerRecord({
        profileId,
        sessionId: null,
        questionnaire,
        question,
        value: valueForQuestion(question.questionId),
        answeredAt: now,
        sourceScreen: "research_questionnaires",
        answerId: `answer_${question.questionId}`,
      }),
    );
}

function valueForQuestion(questionId: string) {
  if (questionId === "ethnicity") return ["european"];
  if (questionId === "birth_year") return "1980";
  if (questionId === "device_familiarity_score") return 4;
  return "prefer_not_to_say";
}

function contextAnswer(questionId: string, value: JsonValue) {
  const question = SESSION_CONTEXT_QUESTIONNAIRE.questions.find(
    (item) => item.questionId === questionId,
  )!;
  return createQuestionnaireAnswerRecord({
    profileId,
    sessionId: "session_1",
    questionnaire: SESSION_CONTEXT_QUESTIONNAIRE,
    question,
    value,
    answeredAt: now,
    sourceScreen: "session_context",
    answerId: `context_${questionId}`,
  });
}
