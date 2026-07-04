import { describe, expect, it } from "vitest";

import {
  EXPORT_SCHEMA_VERSION,
  assertLocalExportEnvelope,
  createExportEnvelopeFromRecords,
  parseLocalExportJson,
} from "@/lib/local/export-schema";
import { LOCAL_APP_VERSION, LOCAL_SCHEMA_VERSION } from "@/lib/local/schema";

const iso = "2026-07-04T00:00:00.000Z";

describe("local export schema", () => {
  it("creates and validates a versioned backup envelope", () => {
    const envelope = createExportEnvelopeFromRecords({
      exportedAt: iso,
      exportId: "export_1",
      origin: "https://senex.nz",
      includeTrialEvents: true,
      records: {
        profiles: [
          {
            profileId: "profile_1",
            mode: "offline",
            createdAt: iso,
            updatedAt: iso,
            schemaVersion: LOCAL_SCHEMA_VERSION,
            appVersion: LOCAL_APP_VERSION,
          },
        ],
        sessions: [
          {
            sessionId: "session_1",
            profileId: "profile_1",
            startedAt: iso,
            completedAt: null,
            cadence: "daily",
            contextSnapshot: {},
            qualityFlags: [],
            schemaVersion: LOCAL_SCHEMA_VERSION,
            appVersion: LOCAL_APP_VERSION,
          },
        ],
        taskRuns: [
          {
            taskRunId: "task_run_1",
            sessionId: "session_1",
            taskId: "simple_reaction_time",
            taskVersion: "1.0.0",
            stimulusPackId: "pack_1",
            stimulusSeed: "seed_1",
            startedAt: iso,
            completedAt: iso,
            summaryScore: { medianRtMs: 412 },
            qualityFlags: [],
            schemaVersion: LOCAL_SCHEMA_VERSION,
            appVersion: LOCAL_APP_VERSION,
          },
        ],
        trialEvents: [],
        scores: [],
        questionnaireAnswers: [],
        consentRecords: [
          {
            consentRecordId: "consent_1",
            profileId: "profile_1",
            mode: "offline",
            consentType: "backup",
            version: "2026-07-04",
            decision: "granted",
            decidedAt: iso,
            sourceScreen: "backup_settings",
            dataCategories: ["local_backup"],
            schemaVersion: LOCAL_SCHEMA_VERSION,
            appVersion: LOCAL_APP_VERSION,
          },
        ],
        anonymousIdentities: [],
        reportingUploads: [],
        importAudits: [],
      },
    });

    expect(envelope.exportSchemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(envelope.localSchemaVersion).toBe(LOCAL_SCHEMA_VERSION);
    expect(envelope.data.consentRecords[0].decidedAt).toBe(iso);
    expect(envelope.data.stimulusReferences).toEqual([
      {
        taskRunId: "task_run_1",
        taskId: "simple_reaction_time",
        taskVersion: "1.0.0",
        stimulusPackId: "pack_1",
        stimulusSeed: "seed_1",
      },
    ]);
    expect(() => assertLocalExportEnvelope(envelope)).not.toThrow();
  });

  it("rejects corrupt JSON and unsupported future versions loudly", () => {
    expect(() => parseLocalExportJson("{not-json")).toThrow(/valid JSON/);

    const future = {
      format: "senex.local-backup",
      exportSchemaVersion: EXPORT_SCHEMA_VERSION + 1,
      localSchemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
      exportId: "export_future",
      exportedAt: iso,
      source: { app: "senex", origin: null, includeTrialEvents: true },
      metadata: { lastSavedAt: null },
      data: {
        profiles: [],
        sessions: [],
        taskRuns: [],
        trialEvents: [],
        scores: [],
        questionnaireAnswers: [],
        consentRecords: [],
        anonymousIdentities: [],
        reportingUploads: [],
        importAudits: [],
        stimulusReferences: [],
      },
    };

    expect(() => assertLocalExportEnvelope(future)).toThrow(
      /future export schema/,
    );
  });

  it("rejects invalid nested local records before import writes", () => {
    const invalid = {
      format: "senex.local-backup",
      exportSchemaVersion: EXPORT_SCHEMA_VERSION,
      localSchemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
      exportId: "export_bad",
      exportedAt: iso,
      source: { app: "senex", origin: null, includeTrialEvents: true },
      metadata: { lastSavedAt: null },
      data: {
        profiles: [{ profileId: "", mode: "offline" }],
        sessions: [],
        taskRuns: [],
        trialEvents: [],
        scores: [],
        questionnaireAnswers: [],
        consentRecords: [],
        anonymousIdentities: [],
        reportingUploads: [],
        importAudits: [],
        stimulusReferences: [],
      },
    };

    expect(() => assertLocalExportEnvelope(invalid)).toThrow(/profileId/);
  });
});
