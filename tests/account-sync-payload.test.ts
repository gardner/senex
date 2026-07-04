import { describe, expect, it } from "vitest";

import { buildAccountSyncPayload } from "@/lib/account-sync/payload";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type AnonymousIdentityRecord,
  type LocalProfile,
  type LocalSession,
} from "@/lib/local/schema";
import type { ExportableLocalRecords } from "@/lib/local/export-schema";

const now = "2026-07-04T00:00:00.000Z";

describe("account sync payload builder", () => {
  it("builds stable idempotency keys without using generatedAt", () => {
    const first = buildAccountSyncPayload({
      accountId: "account_1",
      records: fixtureRecords(),
      generatedAt: now,
    });
    const second = buildAccountSyncPayload({
      accountId: "account_1",
      records: fixtureRecords(),
      generatedAt: "2026-07-05T00:00:00.000Z",
    });

    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.records.sessions[0].sessionId).toBe("local_session_1");
  });

  it("does not silently link anonymous reporting history to an account", () => {
    expect(() =>
      buildAccountSyncPayload({
        accountId: "account_1",
        records: fixtureRecords({
          profileMode: "anonymous_reporting",
          anonymousIdentity: {
            anonymousIdentityId: "anon_identity_1",
            profileId: "local_profile_1",
            anonymousStudyId: "study_1",
            previousAnonymousStudyId: null,
            status: "active",
            createdAt: now,
            updatedAt: now,
            pausedAt: null,
            stoppedAt: null,
            schemaVersion: LOCAL_SCHEMA_VERSION,
            appVersion: LOCAL_APP_VERSION,
          },
        }),
      }),
    ).toThrow("Anonymous reporting history requires explicit account linking");
  });
});

function fixtureRecords(
  options: {
    profileMode?: LocalProfile["mode"];
    anonymousIdentity?: AnonymousIdentityRecord;
  } = {},
): ExportableLocalRecords {
  const profile: LocalProfile = {
    profileId: "local_profile_1",
    mode: options.profileMode ?? "offline",
    createdAt: now,
    updatedAt: now,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
  const session: LocalSession = {
    sessionId: "local_session_1",
    profileId: profile.profileId,
    startedAt: now,
    completedAt: null,
    cadence: "daily",
    contextSnapshot: {},
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
  return {
    profiles: [profile],
    sessions: [session],
    taskRuns: [],
    trialEvents: [],
    scores: [],
    questionnaireAnswers: [],
    consentRecords: [],
    anonymousIdentities: options.anonymousIdentity
      ? [options.anonymousIdentity]
      : [],
    reportingUploads: [],
    importAudits: [],
  };
}
