import type { QuestionnaireDefinition, QuestionnaireQuestion } from "./types";

const COMMON = {
  requiredForTrialContact: false,
  answerVisibility: "anonymous_research",
  allowsPreferNotToSay: true,
} as const;

export const DEMOGRAPHICS_QUESTIONNAIRE: QuestionnaireDefinition = {
  questionnaireId: "demographics_v1",
  version: "2026-07-04",
  title: "Demographics",
  purpose: "Describe the research sample with coarse, self-reported fields.",
  active: true,
  questions: [
    question("birth_year", "Birth year", "date_or_year", true, true),
    question("country_region", "Country or region", "text_short", true, false),
    question("primary_language", "Primary language", "text_short", true, false),
    question(
      "other_languages",
      "Other languages used regularly",
      "text_short",
      false,
      false,
    ),
    select("education_range", "Education range", true, false, [
      ["secondary_or_less", "Secondary school or less"],
      ["certificate_diploma", "Certificate or diploma"],
      ["bachelors", "Bachelor's degree"],
      ["postgraduate", "Postgraduate"],
    ]),
    multi("ethnicity", "Ethnicity", true, true, [
      ["maori", "Maori"],
      ["pacific", "Pacific peoples"],
      ["asian", "Asian"],
      ["middle_eastern_latin_african", "MELAA"],
      ["european", "European"],
      ["other", "Other"],
    ]),
    select("sex_at_birth", "Sex assigned at birth", false, true, [
      ["female", "Female"],
      ["male", "Male"],
      ["another_response", "Another response"],
    ]),
    select("gender", "Gender", false, true, [
      ["woman", "Woman"],
      ["man", "Man"],
      ["non_binary", "Non-binary"],
      ["another_response", "Another response"],
    ]),
    select("handedness", "Handedness", true, false, [
      ["right", "Right"],
      ["left", "Left"],
      ["ambidextrous", "Ambidextrous"],
    ]),
    multi(
      "vision_hearing_limitations",
      "Vision or hearing limitations",
      false,
      true,
      [
        ["none", "None"],
        ["vision", "Vision limitation"],
        ["hearing", "Hearing limitation"],
        ["motor", "Motor/input limitation"],
      ],
    ),
    number(
      "years_using_digital_devices",
      "Years using digital devices",
      false,
      false,
      0,
      80,
    ),
    scale("device_familiarity_score", "Device familiarity", true, false, 1, 5),
  ],
};

export const DEVICE_FAMILIARITY_QUESTIONNAIRE = miniQuestionnaire(
  "device_familiarity_v1",
  "Device familiarity",
  "Understand familiarity with the device used for testing.",
  [scale("browser_comfort", "Comfort using this browser", true, false, 1, 5)],
);

export const SLEEP_STRESS_BASELINE_QUESTIONNAIRE = miniQuestionnaire(
  "sleep_stress_baseline_v1",
  "Typical sleep and stress",
  "Understand usual sleep and stress context.",
  [
    scale("typical_sleep_quality", "Typical sleep quality", true, false, 1, 5),
    scale("typical_stress", "Typical stress", true, false, 1, 5),
  ],
);

export const COGNITIVE_CONCERNS_QUESTIONNAIRE = miniQuestionnaire(
  "cognitive_concerns_v1",
  "Cognitive concerns",
  "Capture optional self-reported concerns without diagnostic claims.",
  [select("memory_concerns", "Memory concerns", true, true, concernOptions())],
);

export const GENERAL_HEALTH_CONTEXT_QUESTIONNAIRE = miniQuestionnaire(
  "general_health_context_v1",
  "General health context",
  "Capture broad self-reported health context for research interpretation.",
  [scale("general_health_rating", "General health rating", true, true, 1, 5)],
);

export const SESSION_CONTEXT_QUESTIONNAIRE: QuestionnaireDefinition = {
  questionnaireId: "session_context_v1",
  version: "2026-07-04",
  title: "Session context",
  purpose: "Explain conditions that may affect an individual test session.",
  active: true,
  questions: [
    select(
      "sleep_quality_last_night",
      "Sleep quality last night",
      false,
      false,
      [
        ["very_poor", "Very poor"],
        ["poor", "Poor"],
        ["ok", "OK"],
        ["good", "Good"],
      ],
    ),
    scale("stress_today", "Stress during this session", false, false, 1, 5),
    select("illness_today", "Illness today", false, true, [
      ["no", "No"],
      ["yes", "Yes"],
    ]),
    multi("substances_24h", "Substances in the past 24 hours", false, true, [
      ["none", "None"],
      ["alcohol", "Alcohol"],
      ["cannabis", "Cannabis"],
      ["sedating_medicine", "Sedating medicine"],
    ]),
    scale(
      "distractions_during_test",
      "Distractions during test",
      false,
      false,
      1,
      5,
    ),
    question(
      "session_context_notes",
      "Session context notes",
      "text_short",
      false,
      true,
    ),
  ],
};

export const P0_RESEARCH_PROFILE_QUESTIONNAIRES = [
  DEMOGRAPHICS_QUESTIONNAIRE,
  DEVICE_FAMILIARITY_QUESTIONNAIRE,
  SLEEP_STRESS_BASELINE_QUESTIONNAIRE,
  COGNITIVE_CONCERNS_QUESTIONNAIRE,
  GENERAL_HEALTH_CONTEXT_QUESTIONNAIRE,
] as const;

function miniQuestionnaire(
  questionnaireId: string,
  title: string,
  purpose: string,
  questions: QuestionnaireQuestion[],
): QuestionnaireDefinition {
  return {
    questionnaireId,
    version: "2026-07-04",
    title,
    purpose,
    active: true,
    questions,
  };
}

function question(
  questionId: string,
  label: string,
  type: QuestionnaireQuestion["type"],
  required: boolean,
  sensitive: boolean,
): QuestionnaireQuestion {
  return {
    questionId,
    version: "1",
    label,
    type,
    requiredness: required ? "required" : "optional",
    requiredForReporting: required,
    sensitive,
    researchPurpose: "Research interpretation and cohort description.",
    ...COMMON,
  };
}

function select(
  questionId: string,
  label: string,
  required: boolean,
  sensitive: boolean,
  options: Array<[string, string]>,
) {
  return {
    ...question(questionId, label, "single_choice", required, sensitive),
    options: optionList(options),
  };
}

function multi(
  questionId: string,
  label: string,
  required: boolean,
  sensitive: boolean,
  options: Array<[string, string]>,
) {
  return {
    ...question(questionId, label, "multi_choice", required, sensitive),
    options: optionList(options),
  };
}

function scale(
  questionId: string,
  label: string,
  required: boolean,
  sensitive: boolean,
  min: number,
  max: number,
) {
  return {
    ...question(questionId, label, "scale", required, sensitive),
    min,
    max,
    step: 1,
  };
}

function number(
  questionId: string,
  label: string,
  required: boolean,
  sensitive: boolean,
  min: number,
  max: number,
) {
  return {
    ...question(questionId, label, "number", required, sensitive),
    min,
    max,
    step: 1,
  };
}

function optionList(options: Array<[string, string]>) {
  return options.map(([value, label]) => ({ value, label }));
}

function concernOptions(): Array<[string, string]> {
  return [
    ["none", "No current concern"],
    ["mild", "Mild concern"],
    ["moderate", "Moderate concern"],
    ["significant", "Significant concern"],
  ];
}
