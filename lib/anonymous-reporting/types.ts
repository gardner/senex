import type {
  ConsentDecision,
  ConsentRecord,
  LocalCadence,
  LocalSession,
  QuestionnaireAnswerRecord,
  ScoreRecord,
  TaskRunRecord,
  TrialEventRecord,
} from "@/lib/local/schema";

export const CONSENT_CATEGORY_IDS = [
  "share_test_summaries",
  "share_trial_level_data",
  "share_session_context",
  "share_demographics",
  "share_questionnaires",
  "allow_longitudinal_research_use",
  "allow_approved_partner_access",
] as const;

export type ConsentCategoryId = (typeof CONSENT_CATEGORY_IDS)[number];
export type ActiveConsentDecision = ConsentDecision | "missing";

export interface ConsentCategoryDefinition {
  id: ConsentCategoryId;
  label: string;
  payloadLabel: string;
  description: string;
}

export interface ActiveConsentSnapshot {
  termsVersion: string;
  decisions: Record<ConsentCategoryId, ActiveConsentDecision>;
  grantedCategories: ConsentCategoryId[];
  latestRecordIds: Partial<Record<ConsentCategoryId, string>>;
}

export interface ActiveConsentState extends ActiveConsentSnapshot {
  history: ConsentRecord[];
}

export type AnonymousReportingScope =
  | { type: "all_existing_history" }
  | { type: "from_today"; today: string }
  | { type: "date_range"; from: string; to: string };

export interface AnonymousReportingLocalData {
  sessions: LocalSession[];
  taskRuns: TaskRunRecord[];
  trialEvents: TrialEventRecord[];
  scores: ScoreRecord[];
  questionnaireAnswers: QuestionnaireAnswerRecord[];
}

export interface AnonymousSessionSummary {
  sessionId: string;
  profileId: string;
  startedAt: string;
  completedAt: string | null;
  cadence: LocalCadence;
  qualityFlags: string[];
}

export interface AnonymousTaskRunSummary {
  taskRunId: string;
  sessionId: string;
  taskId: string;
  taskVersion: string;
  stimulusPackId: string;
  startedAt: string;
  completedAt: string | null;
  summaryScore: Record<string, unknown>;
  qualityFlags: string[];
}

export interface AnonymousSessionContext {
  sessionId: string;
  contextSnapshot: Record<string, unknown>;
  qualityFlags: string[];
}

export interface AnonymousReportingPayloadData {
  sessionSummaries?: AnonymousSessionSummary[];
  taskRunSummaries?: AnonymousTaskRunSummary[];
  scores?: ScoreRecord[];
  trialEvents?: TrialEventRecord[];
  sessionContext?: AnonymousSessionContext[];
  demographics?: QuestionnaireAnswerRecord[];
  questionnaireAnswers?: QuestionnaireAnswerRecord[];
}

export interface AnonymousReportingPayload {
  payloadVersion: "anonymous-reporting-v1";
  anonymousStudyId: string;
  identityStatus: "active" | "paused" | "stopped";
  generatedAt: string;
  scope: AnonymousReportingScope;
  includedCategories: ConsentCategoryId[];
  consentSnapshot: ActiveConsentSnapshot;
  data: AnonymousReportingPayloadData;
  schemaVersions: {
    local: number;
    app: string;
  };
  idempotencyKey: string;
}
