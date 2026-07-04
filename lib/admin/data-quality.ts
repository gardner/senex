import { env } from "cloudflare:workers";

import {
  validateAnonymousReportingPayload,
  type AnonymousReportingPayload,
} from "@/lib/anonymous-reporting";
import {
  buildDataQualityDashboard,
  type RetryStateRow,
} from "@/lib/admin/data-quality-metrics";

export type DataQualityDashboard = Awaited<
  ReturnType<typeof getAnonymousDataQualityDashboard>
>;

type PayloadRow = { payload_json: string };

export async function getAnonymousDataQualityDashboard() {
  const [payloads, retryRows] = await Promise.all([
    listAcceptedPayloads(),
    listRetryStateFrequency(),
  ]);
  return buildDataQualityDashboard(
    payloads,
    retryRows,
    new Date().toISOString(),
  );
}

async function listAcceptedPayloads() {
  const { results } = await env.DB.prepare(
    `SELECT payload_json
     FROM anonymous_research_submissions
     WHERE status = 'accepted'
     ORDER BY received_at ASC`,
  ).all<PayloadRow>();
  return results.map((row) =>
    validateAnonymousReportingPayload(parseStoredPayload(row.payload_json)),
  );
}

async function listRetryStateFrequency() {
  const { results } = await env.DB.prepare(
    `SELECT retry_state, COUNT(*) AS count
     FROM anonymous_research_ingestion_failures
     GROUP BY retry_state
     ORDER BY count DESC, retry_state ASC`,
  ).all<RetryStateRow>();
  return results;
}

function parseStoredPayload(value: string): AnonymousReportingPayload {
  try {
    return JSON.parse(value) as AnonymousReportingPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Stored anonymous reporting payload is invalid JSON: ${message}`,
    );
  }
}
