import {
  assertConsentRecord,
  assertLocalSession,
  assertScoreRecord,
  assertTaskRunRecord,
  assertTrialEventRecord,
  type ConsentRecord,
  type LocalSession,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "@/lib/local/schema";

export interface AccountSyncPayload {
  payloadVersion: "account-sync-v1";
  accountId?: string;
  idempotencyKey: string;
  sourceProfileId: string;
  generatedAt: string;
  schemaVersions: {
    local: number;
    app: string;
  };
  records: {
    sessions: LocalSession[];
    taskRuns: TaskRunRecord[];
    trialEvents: TrialEventRecord[];
    scores: ScoreRecord[];
    consentEvents: ConsentRecord[];
  };
}

export function validateAccountSyncPayload(value: unknown): AccountSyncPayload {
  const payload = asRecord(value, "payload");
  expectLiteral(payload, "payloadVersion", "account-sync-v1");
  expectOptionalString(payload, "accountId", "payload");
  expectString(payload, "idempotencyKey", "payload");
  expectString(payload, "sourceProfileId", "payload");
  expectIso(payload, "generatedAt", "payload");
  validateSchemaVersions(payload.schemaVersions);
  const records = validateRecords(payload.records);
  validateRelationships(payload.sourceProfileId as string, records);

  return {
    payloadVersion: "account-sync-v1",
    accountId: payload.accountId as string | undefined,
    idempotencyKey: payload.idempotencyKey as string,
    sourceProfileId: payload.sourceProfileId as string,
    generatedAt: payload.generatedAt as string,
    schemaVersions:
      payload.schemaVersions as AccountSyncPayload["schemaVersions"],
    records,
  };
}

function validateSchemaVersions(value: unknown) {
  const schemaVersions = asRecord(value, "schemaVersions");
  if (
    !Number.isInteger(schemaVersions.local) ||
    (schemaVersions.local as number) < 1
  ) {
    throw new Error("schemaVersions.local must be a positive integer");
  }
  expectString(schemaVersions, "app", "schemaVersions");
}

function validateRecords(value: unknown): AccountSyncPayload["records"] {
  const records = asRecord(value, "records");
  return {
    sessions: validateArray(records.sessions, assertLocalSession, "sessions"),
    taskRuns: validateArray(records.taskRuns, assertTaskRunRecord, "taskRuns"),
    trialEvents: validateArray(
      records.trialEvents,
      assertTrialEventRecord,
      "trialEvents",
    ),
    scores: validateArray(records.scores, assertScoreRecord, "scores"),
    consentEvents: validateArray(
      records.consentEvents,
      assertConsentRecord,
      "consentEvents",
    ),
  };
}

function validateRelationships(
  sourceProfileId: string,
  records: AccountSyncPayload["records"],
) {
  const sessionIds = new Set(
    records.sessions.map((session) => session.sessionId),
  );
  const taskRunIds = new Set(
    records.taskRuns.map((taskRun) => taskRun.taskRunId),
  );
  for (const session of records.sessions) {
    if (session.profileId !== sourceProfileId) {
      throw new Error("sessions must belong to sourceProfileId");
    }
  }
  for (const taskRun of records.taskRuns) {
    if (!sessionIds.has(taskRun.sessionId)) {
      throw new Error(
        `taskRun ${taskRun.taskRunId} references a missing session`,
      );
    }
  }
  for (const event of records.trialEvents) {
    if (!taskRunIds.has(event.taskRunId)) {
      throw new Error(
        `trialEvent ${event.trialEventId} references a missing taskRun`,
      );
    }
  }
  for (const score of records.scores) {
    if (!sessionIds.has(score.sessionId) || !taskRunIds.has(score.taskRunId)) {
      throw new Error(`score ${score.scoreId} references missing test records`);
    }
  }
  for (const consent of records.consentEvents) {
    if (consent.profileId !== sourceProfileId) {
      throw new Error("consentEvents must belong to sourceProfileId");
    }
  }
}

function validateArray<T>(
  value: unknown,
  assertItem: (item: unknown) => asserts item is T,
  name: string,
) {
  if (!Array.isArray(value))
    throw new Error(`records.${name} must be an array`);
  for (const item of value) assertItem(item);
  return value;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function expectString(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (typeof record[field] !== "string" || record[field].length === 0) {
    throw new Error(`${name}.${field} must be a non-empty string`);
  }
}

function expectOptionalString(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (record[field] === undefined) return;
  expectString(record, field, name);
}

function expectLiteral(
  record: Record<string, unknown>,
  field: string,
  expected: string,
) {
  if (record[field] !== expected) {
    throw new Error(`${field} must be ${expected}`);
  }
}

function expectIso(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  expectString(record, field, name);
  const value = record[field] as string;
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${name}.${field} must be an ISO timestamp`);
  }
}
