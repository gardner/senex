import { auth } from "@/lib/auth";
import { readTrialContact, saveTrialContact } from "@/lib/trial-contact/server";
import {
  sanitizeTrialContactProfile,
  type TrialContactProfileInput,
} from "@/lib/trial-contact/schema";

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

  let input: TrialContactRequest;
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

  return json({
    status: "ok",
    trialContact: await saveTrialContact(session.user.id, input),
  });
}

function validateRequest(value: unknown): TrialContactRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Trial contact request must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.enabled !== undefined && typeof record.enabled !== "boolean") {
    throw new Error("enabled must be a boolean.");
  }
  if (record.enabled === undefined && record.profile === undefined) {
    throw new Error("enabled or profile is required.");
  }
  return {
    enabled: record.enabled,
    profile:
      record.profile === undefined
        ? undefined
        : sanitizeTrialContactProfile(record.profile),
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

type TrialContactRequest = {
  enabled?: boolean;
  profile?: TrialContactProfileInput;
};
