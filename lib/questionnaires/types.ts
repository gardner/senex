import type { JsonValue, QuestionnaireAnswerRecord } from "@/lib/local/schema";

export const QUESTION_TYPES = [
  "single_choice",
  "multi_choice",
  "number",
  "text_short",
  "scale",
  "date_or_year",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionRequiredness = "required" | "optional";
export type QuestionSensitivity = "standard" | "sensitive";
export type AnswerVisibility =
  | "local_only"
  | "anonymous_research"
  | "trial_contact";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionnaireQuestion {
  questionId: string;
  version: string;
  label: string;
  type: QuestionType;
  requiredness: QuestionRequiredness;
  requiredForReporting: boolean;
  requiredForTrialContact: boolean;
  sensitive: boolean;
  researchPurpose: string;
  answerVisibility: AnswerVisibility;
  allowsPreferNotToSay: boolean;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface QuestionnaireDefinition {
  questionnaireId: string;
  version: string;
  title: string;
  purpose: string;
  active: boolean;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireCompletionSection {
  questionnaireId: string;
  version: string;
  title: string;
  status: "not_started" | "in_progress" | "complete";
  requiredTotal: number;
  requiredAnswered: number;
  optionalAnswered: number;
  missingRequired: string[];
}

export interface ResearchProfileCompletionState {
  overall: {
    status: "not_started" | "in_progress" | "complete";
    completeSections: number;
    totalSections: number;
  };
  sections: Record<string, QuestionnaireCompletionSection>;
}

export type AnswerValueInput = JsonValue | undefined;

export interface CreateQuestionnaireAnswerInput {
  profileId: string;
  sessionId: string | null;
  questionnaire: QuestionnaireDefinition;
  question: QuestionnaireQuestion;
  value: AnswerValueInput;
  answeredAt: string;
  sourceScreen: string;
  answerId?: string;
}

export type LatestAnswerMap = Map<string, QuestionnaireAnswerRecord>;
