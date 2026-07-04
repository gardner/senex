import { env } from "cloudflare:workers";

import {
  emptyTrialContactProfile,
  isEmptyTrialContactProfile,
  TRIAL_CONTACT_CONSENT_VERSION,
  TRIAL_CONTACT_PROFILE_VERSION,
  type TrialContactProfileInput,
} from "./schema";

const TRIAL_CONTACT_SOURCE = "account_trial_contact";
const TRIAL_CONTACT_PROFILE_SOURCE = "account_trial_contact_profile";

export async function readTrialContact(userId: string) {
  const [statusRow, profileRow] = await Promise.all([
    readStatusRow(userId),
    readProfileRow(userId),
  ]);
  return {
    ...formatStatusRow(statusRow),
    profile: formatProfileRow(profileRow),
  };
}

export async function saveTrialContact(
  userId: string,
  input: {
    enabled?: boolean;
    profile?: TrialContactProfileInput;
  },
) {
  const decidedAt = new Date().toISOString();
  const statements = [];
  if (input.enabled !== undefined) {
    const existing = await readStatusRow(userId);
    const next = nextStatus(existing, input.enabled, decidedAt);
    statements.push(
      ...statusStatements(userId, input.enabled, next, decidedAt),
    );
  }
  if (input.profile !== undefined) {
    statements.push(...profileStatements(userId, input.profile, decidedAt));
  }
  if (statements.length === 0) {
    throw new Error("Trial contact update requires enabled or profile.");
  }
  await env.DB.batch(statements);
  return readTrialContact(userId);
}

async function readStatusRow(userId: string) {
  return env.DB.prepare(
    `SELECT user_id, enabled, consent_version, opted_in_at, opted_out_at, last_reviewed_at, updated_at
     FROM trial_contact_status
     WHERE user_id = ?`,
  )
    .bind(userId)
    .first<TrialContactStatusRow>();
}

async function readProfileRow(userId: string) {
  return env.DB.prepare(
    `SELECT user_id, profile_version, preferred_contact_method,
            country_region, age_eligibility, broad_health_answers_json,
            availability_preference, last_reviewed_at, updated_at
     FROM trial_contact_profiles
     WHERE user_id = ?`,
  )
    .bind(userId)
    .first<TrialContactProfileRow>();
}

function nextStatus(
  existing: TrialContactStatusRow | null,
  enabled: boolean,
  decidedAt: string,
) {
  if (enabled) {
    return {
      opted_in_at: existing?.enabled ? existing.opted_in_at : decidedAt,
      opted_out_at: null,
    };
  }
  return {
    opted_in_at: existing?.opted_in_at ?? null,
    opted_out_at: decidedAt,
  };
}

function formatStatusRow(row: TrialContactStatusRow | null) {
  if (!row) {
    return {
      enabled: false,
      consentVersion: TRIAL_CONTACT_CONSENT_VERSION,
      optedInAt: null,
      optedOutAt: null,
      lastReviewedAt: null,
      updatedAt: null,
    };
  }
  return {
    enabled: Boolean(row.enabled),
    consentVersion: row.consent_version,
    optedInAt: row.opted_in_at,
    optedOutAt: row.opted_out_at,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
  };
}

function formatProfileRow(row: TrialContactProfileRow | null) {
  if (!row) return emptyTrialContactProfile();
  return {
    profileVersion: row.profile_version,
    preferredContactMethod: row.preferred_contact_method,
    countryRegion: row.country_region,
    ageEligibility: row.age_eligibility,
    broadHealthAnswers: JSON.parse(row.broad_health_answers_json) as string[],
    availabilityPreference: row.availability_preference,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
  };
}

function statusStatements(
  userId: string,
  enabled: boolean,
  next: { opted_in_at: string | null; opted_out_at: string | null },
  decidedAt: string,
) {
  return [
    env.DB.prepare(
      `INSERT INTO trial_contact_consent_events (
         event_id,
         user_id,
         enabled,
         consent_version,
         decided_at,
         source,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      `trial_contact_event_${crypto.randomUUID()}`,
      userId,
      Number(enabled),
      TRIAL_CONTACT_CONSENT_VERSION,
      decidedAt,
      TRIAL_CONTACT_SOURCE,
      decidedAt,
    ),
    env.DB.prepare(
      `INSERT INTO trial_contact_status (
         user_id,
         enabled,
         consent_version,
         opted_in_at,
         opted_out_at,
         last_reviewed_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         enabled = excluded.enabled,
         consent_version = excluded.consent_version,
         opted_in_at = excluded.opted_in_at,
         opted_out_at = excluded.opted_out_at,
         last_reviewed_at = excluded.last_reviewed_at,
         updated_at = excluded.updated_at`,
    ).bind(
      userId,
      Number(enabled),
      TRIAL_CONTACT_CONSENT_VERSION,
      next.opted_in_at,
      next.opted_out_at,
      decidedAt,
      decidedAt,
    ),
  ];
}

function profileStatements(
  userId: string,
  profile: TrialContactProfileInput,
  reviewedAt: string,
) {
  const eventType = isEmptyTrialContactProfile(profile) ? "cleared" : "updated";
  const answersJson = JSON.stringify(profile.broadHealthAnswers);
  return [
    env.DB.prepare(
      `INSERT INTO trial_contact_profile_events (
         event_id,
         user_id,
         event_type,
         profile_version,
         preferred_contact_method,
         country_region,
         age_eligibility,
         broad_health_answers_json,
         availability_preference,
         reviewed_at,
         source,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      `trial_contact_profile_event_${crypto.randomUUID()}`,
      userId,
      eventType,
      TRIAL_CONTACT_PROFILE_VERSION,
      profile.preferredContactMethod,
      profile.countryRegion,
      profile.ageEligibility,
      answersJson,
      profile.availabilityPreference,
      reviewedAt,
      TRIAL_CONTACT_PROFILE_SOURCE,
      reviewedAt,
    ),
    env.DB.prepare(
      `INSERT INTO trial_contact_profiles (
         user_id,
         profile_version,
         preferred_contact_method,
         country_region,
         age_eligibility,
         broad_health_answers_json,
         availability_preference,
         last_reviewed_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         profile_version = excluded.profile_version,
         preferred_contact_method = excluded.preferred_contact_method,
         country_region = excluded.country_region,
         age_eligibility = excluded.age_eligibility,
         broad_health_answers_json = excluded.broad_health_answers_json,
         availability_preference = excluded.availability_preference,
         last_reviewed_at = excluded.last_reviewed_at,
         updated_at = excluded.updated_at`,
    ).bind(
      userId,
      TRIAL_CONTACT_PROFILE_VERSION,
      profile.preferredContactMethod,
      profile.countryRegion,
      profile.ageEligibility,
      answersJson,
      profile.availabilityPreference,
      reviewedAt,
      reviewedAt,
    ),
  ];
}

type TrialContactStatusRow = {
  user_id: string;
  enabled: number;
  consent_version: string;
  opted_in_at: string | null;
  opted_out_at: string | null;
  last_reviewed_at: string;
  updated_at: string;
};

type TrialContactProfileRow = {
  user_id: string;
  profile_version: string;
  preferred_contact_method: string | null;
  country_region: string | null;
  age_eligibility: string | null;
  broad_health_answers_json: string;
  availability_preference: string | null;
  last_reviewed_at: string;
  updated_at: string;
};
