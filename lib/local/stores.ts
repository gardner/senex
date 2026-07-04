export const LOCAL_STORES = {
  metadata: "metadata",
  profiles: "profiles",
  sessions: "sessions",
  taskRuns: "taskRuns",
  trialEvents: "trialEvents",
  scores: "scores",
  questionnaireAnswers: "questionnaireAnswers",
  consentRecords: "consentRecords",
  anonymousIdentities: "anonymousIdentities",
  reportingUploads: "reportingUploads",
  importAudits: "importAudits",
} as const;

export type StoreName = (typeof LOCAL_STORES)[keyof typeof LOCAL_STORES];
