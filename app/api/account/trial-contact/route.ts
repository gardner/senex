import { env } from "cloudflare:workers";

import { auth } from "@/lib/auth";

const TRIAL_CONTACT_CONSENT_VERSION = "trial-contact-v1";
const TRIAL_CONTACT_SOURCE = "account_trial_contact";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return unauthorized();

  return json({
    status: "ok",
    trialContact: await readTrialContact(session.user.id),
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return unauthorized();

  let input: { enabled: boolean };
  try {
    input = validateRequest(await request.json());
  } catch (error) {
    return json(
      {
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }

  const existing = await readStatusRow(session.user.id);
  const decidedAt = new Date().toISOString();
  const next = nextStatus(existing, input.enabled, decidedAt);
  await env.DB.batch([
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
      session.user.id,
      Number(input.enabled),
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
      session.user.id,
      Number(input.enabled),
      TRIAL_CONTACT_CONSENT_VERSION,
      next.opted_in_at,
      next.opted_out_at,
      decidedAt,
      decidedAt,
    ),
  ]);

  return json({
    status: "ok",
    trialContact: formatStatusRow({
      ...next,
      user_id: session.user.id,
      enabled: Number(input.enabled),
      consent_version: TRIAL_CONTACT_CONSENT_VERSION,
      last_reviewed_at: decidedAt,
      updated_at: decidedAt,
    }),
  });
}

async function readTrialContact(userId: string) {
  const row = await readStatusRow(userId);
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
  return formatStatusRow(row);
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

function validateRequest(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Trial contact request must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.enabled !== "boolean") {
    throw new Error("enabled must be a boolean.");
  }
  return { enabled: record.enabled };
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

function formatStatusRow(row: TrialContactStatusRow) {
  return {
    enabled: Boolean(row.enabled),
    consentVersion: row.consent_version,
    optedInAt: row.opted_in_at,
    optedOutAt: row.opted_out_at,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
  };
}

function unauthorized() {
  return json({ status: "rejected", error: "Authentication required." }, 401);
}

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
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
