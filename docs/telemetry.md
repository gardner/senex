# Telemetry Boundaries

Date: 2026-07-05

Scope: E12-T01 definition of privacy-respecting telemetry boundaries for
Senex. This document governs future engineering telemetry, product analytics,
and cognitive data observability work.

Product analytics != cognitive test data

## Boundary

Telemetry may help operators understand whether Senex is healthy. It must not
become a second research-ingestion path, a hidden analytics product, or a
shortcut around consent. Offline Mode remains private by default.

## Mode Rules

| Mode                      | Allowed by default                                                                                                                                                                             | Not allowed by default                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Offline Mode              | Local UI state needed to finish a test, local import/export audit records, and browser storage status shown to the user.                                                                       | Product analytics uploads, browser beacons, raw task data uploads, questionnaire uploads, or stable user identifiers.                   |
| Anonymous Reporting Mode  | User-triggered research uploads covered by the active consent snapshot. Future engineering telemetry may record minimal upload failure categories after a user has entered the reporting flow. | Telemetry that includes raw cognitive test data, raw trial events, sensitive answers, notes, or data categories not covered by consent. |
| Signed-In Mode            | Authenticated account operations, sync/import/export failures, and version/schema health needed to run the account service.                                                                    | Trial-contact data mixed into analytics, contact details in logs, or research export data outside governed research workflows.          |
| Admin/research operations | Aggregate operational health, redacted ingestion failure counts, schema-version distribution, and export-job status.                                                                           | Direct identifiers, small-cell dashboards that can identify a person, raw payload JSON, or stable study identifiers in logs.            |

## Allowed Engineering Events

E12-T02 telemetry defines explicit event types for:

- app error category
- failed import reason
- failed anonymous upload reason
- failed account sync reason
- test abort reason
- app version adoption
- local schema migration failure or success category

Each event must be minimal, schema-validated, and safe to aggregate. Event
payloads should prefer coarse enumerations over free text. Telemetry failures
must never block local test completion, JSON export/import, consent withdrawal,
or account access.

## Forbidden Telemetry Payloads

Do not send or log:

- raw cognitive test data
- raw trial events
- reaction-time values or score values
- questionnaire answers
- demographics or broad health answers
- free-text notes
- names, emails, contact details, or addresses
- anonymous study IDs, account IDs, session IDs, task-run IDs, idempotency keys,
  or other stable study identifiers
- full import/export files
- raw failed upload payloads
- IP-derived geolocation beyond what Cloudflare may already expose in
  operational request metadata

## Destinations

Worker logs are operational service telemetry.

Cloudflare Workers observability is for service health and debugging. Worker
logs are operational service telemetry, not product analytics. When adding log
statements, log only short error codes, route names, schema versions, and coarse
counts.

Workers Analytics Engine may be considered for future aggregate operational
metrics because it is designed for custom Worker analytics and time-series
queries. Use it only with explicit low-cardinality dimensions and redacted
payloads. Do not use it to store cognitive measurements or research records.

Browser-side analytics transports such as MDN sendBeacon, `fetch` with
`keepalive: true`, or third-party analytics SDKs are not allowed in Offline Mode
by default. If browser telemetry is later added, it must be explicitly opt-in,
schema-filtered, and covered by tests before any request is emitted.

## Review Checklist

- Offline Mode has no browser analytics transport by default.
- Anonymous Reporting uploads still use the consent-gated payload builder.
- Signed-In telemetry excludes trial-contact and research payload data.
- Server logs avoid raw payloads and stable identifiers.
- Aggregate dashboards apply small-cell and re-identification checks before
  release.
- Telemetry schemas reject unknown event names and unknown fields.
- Telemetry failures are non-blocking and visible only as operational status.
- `tests/telemetry-boundaries.test.ts` passes.

## Current Implementation

`lib/telemetry.ts` defines the `engineering-telemetry-v1` event contract,
coarse failure classification, strict detail allowlisting, and a non-blocking
capture wrapper. The default capture path dispatches a local browser event for
in-app instrumentation and sends nothing over the network.

Current capture points:

- global app render errors through `app/global-error.tsx`
- failed JSON import preview and restore attempts
- failed anonymous reporting upload submission
- failed account-sync local loading and submit attempts
- hidden-tab task interruptions for interactive tasks
- local schema migration success/failure and app/schema version adoption

All current events exclude raw payloads, identifiers, questionnaire answers,
trial data, scores, and free-text notes.

## References

- [Cloudflare Workers observability](https://developers.cloudflare.com/workers/observability/)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Cloudflare Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Cloudflare Workers Analytics Engine limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
- [MDN sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [Anonymous Reporting](anonymous-reporting.md)
- [Local Data Platform](local-data.md)
- [PRD privacy principles](PRD.md#5-product-principles)
