import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type AnonymousIdentityRecord,
} from "@/lib/local/schema";

export function createAnonymousIdentityRecord(input: {
  profileId: string;
  anonymousStudyId?: string;
  createdAt: string;
  previousAnonymousStudyId?: string | null;
}): AnonymousIdentityRecord {
  const anonymousStudyId =
    input.anonymousStudyId ?? `study_${crypto.randomUUID()}`;
  return {
    anonymousIdentityId: `anonymous_identity_${anonymousStudyId}`,
    profileId: input.profileId,
    anonymousStudyId,
    previousAnonymousStudyId: input.previousAnonymousStudyId ?? null,
    status: "active",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    pausedAt: null,
    stoppedAt: null,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

export function pauseAnonymousIdentityRecord(
  identity: AnonymousIdentityRecord,
  pausedAt: string,
): AnonymousIdentityRecord {
  return {
    ...identity,
    status: "paused",
    pausedAt,
    updatedAt: pausedAt,
  };
}

export function stopAnonymousIdentityRecord(
  identity: AnonymousIdentityRecord,
  stoppedAt: string,
): AnonymousIdentityRecord {
  return {
    ...identity,
    status: "stopped",
    stoppedAt,
    updatedAt: stoppedAt,
  };
}

export function resetAnonymousIdentityRecord(
  identity: AnonymousIdentityRecord,
  input: { anonymousStudyId?: string; createdAt: string },
) {
  const oldIdentity =
    identity.status === "stopped"
      ? identity
      : stopAnonymousIdentityRecord(identity, input.createdAt);
  const newIdentity = createAnonymousIdentityRecord({
    profileId: identity.profileId,
    anonymousStudyId: input.anonymousStudyId,
    createdAt: input.createdAt,
    previousAnonymousStudyId: identity.anonymousStudyId,
  });
  return { oldIdentity, newIdentity };
}
