import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_ACCOUNT_LINK_CONSENT_TYPE,
  createAnonymousAccountLinkConsentRecord,
} from "@/lib/account-sync/anonymous-link";
import { buildAccountSyncPayload } from "@/lib/account-sync/payload";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type AnonymousIdentityRecord,
  type ConsentRecord,
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

  it("requires account-specific consent before linking anonymous history", () => {
    const anonymousIdentity = fixtureAnonymousIdentity();
    const declinedLink = createAnonymousAccountLinkConsentRecord({
      profileId: "local_profile_1",
      accountId: "account_1",
      decision: "denied",
      decidedAt: now,
      consentRecordId: "consent_link_denied",
    });
    const otherAccountLink = createAnonymousAccountLinkConsentRecord({
      profileId: "local_profile_1",
      accountId: "account_2",
      decision: "granted",
      decidedAt: "2026-07-04T00:01:00.000Z",
      consentRecordId: "consent_link_other_account",
    });

    expect(() =>
      buildAccountSyncPayload({
        accountId: "account_1",
        records: fixtureRecords({
          anonymousIdentity,
          consentRecords: [declinedLink, otherAccountLink],
        }),
      }),
    ).toThrow("Anonymous reporting history requires explicit account linking");

    const grantedLink = createAnonymousAccountLinkConsentRecord({
      profileId: "local_profile_1",
      accountId: "account_1",
      decision: "granted",
      decidedAt: "2026-07-04T00:02:00.000Z",
      consentRecordId: "consent_link_granted",
    });
    const payload = buildAccountSyncPayload({
      accountId: "account_1",
      records: fixtureRecords({
        anonymousIdentity,
        consentRecords: [declinedLink, grantedLink],
      }),
    });

    expect(payload.records.consentEvents).toEqual([declinedLink, grantedLink]);
    expect(payload.records.consentEvents.at(-1)?.consentType).toBe(
      ANONYMOUS_ACCOUNT_LINK_CONSENT_TYPE,
    );
  });
});

function fixtureRecords(
  options: {
    profileMode?: LocalProfile["mode"];
    anonymousIdentity?: AnonymousIdentityRecord;
    consentRecords?: ConsentRecord[];
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
    consentRecords: options.consentRecords ?? [],
    anonymousIdentities: options.anonymousIdentity
      ? [options.anonymousIdentity]
      : [],
    reportingUploads: [],
    importAudits: [],
  };
}

function fixtureAnonymousIdentity(): AnonymousIdentityRecord {
  return {
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
  };
}
