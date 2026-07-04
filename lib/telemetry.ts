export const ENGINEERING_TELEMETRY_VERSION = "engineering-telemetry-v1";
export const ENGINEERING_TELEMETRY_BROWSER_EVENT =
  "senex-engineering-telemetry";

export type TelemetryMode =
  | "offline"
  | "anonymous_reporting"
  | "signed_in"
  | "admin";

export type EngineeringTelemetryType =
  | "app_error"
  | "import_failure"
  | "anonymous_upload_failure"
  | "account_sync_failure"
  | "test_abort"
  | "version_adoption"
  | "local_schema_migration_failure"
  | "local_schema_migration_success";

export type TelemetryReason =
  | "authentication_required"
  | "consent_required"
  | "future_schema"
  | "network_or_server_error"
  | "payload_too_large"
  | "permission_denied"
  | "storage_unavailable"
  | "unknown"
  | "validation_failed";

export type TelemetryDetails = Partial<{
  appVersion: string;
  component: string;
  digestPresent: boolean;
  fromSchemaVersion: number | "missing" | "unknown";
  includedCategoryCount: number;
  inputMethod: "keyboard" | "pointer" | "touch" | "mixed" | "unknown";
  localSchemaVersion: number;
  operation: "load" | "preview" | "restore" | "submit" | "migrate" | "render";
  reason: TelemetryReason | "tab_hidden" | "focus_lost" | "user_cancelled";
  recordCategoryCount: number;
  responseStatus: number;
  route: string;
  taskId: string;
  toSchemaVersion: number;
  visibilityState: "hidden" | "visible" | "unknown";
}>;

export type EngineeringTelemetryEvent = {
  eventVersion: typeof ENGINEERING_TELEMETRY_VERSION;
  type: EngineeringTelemetryType;
  mode: TelemetryMode;
  occurredAt: string;
  details: TelemetryDetails;
};

type TelemetryInput = Omit<
  EngineeringTelemetryEvent,
  "eventVersion" | "details"
> & {
  details?: Record<string, unknown>;
};

export type TelemetrySink = (
  event: EngineeringTelemetryEvent,
) => void | Promise<void>;

const ALLOWED_DETAIL_KEYS = [
  "appVersion",
  "component",
  "digestPresent",
  "fromSchemaVersion",
  "includedCategoryCount",
  "inputMethod",
  "localSchemaVersion",
  "operation",
  "reason",
  "recordCategoryCount",
  "responseStatus",
  "route",
  "taskId",
  "toSchemaVersion",
  "visibilityState",
] as const;

const ALLOWED_DETAIL_KEY_SET = new Set<string>(ALLOWED_DETAIL_KEYS);

const FORBIDDEN_DETAIL_KEYS =
  /(?:accountid|answer|contact|email|name|note|payload|score|study|trial)/i;
const SAFE_STRING = /^[a-z0-9_./:-]+$/i;
const FAILURE_REASON_PATTERNS: ReadonlyArray<{
  reason: TelemetryReason;
  patterns: readonly string[];
}> = [
  { reason: "authentication_required", patterns: ["authentication required"] },
  {
    reason: "consent_required",
    patterns: ["explicit account link", "consent"],
  },
  { reason: "future_schema", patterns: ["future local schema"] },
  { reason: "payload_too_large", patterns: ["too large"] },
  {
    reason: "permission_denied",
    patterns: ["accountid does not match", "forbidden", "permission"],
  },
  { reason: "storage_unavailable", patterns: ["indexeddb", "storage"] },
  { reason: "validation_failed", patterns: ["invalid", "validation"] },
  {
    reason: "network_or_server_error",
    patterns: ["failed", "network"],
  },
];

export function buildEngineeringTelemetryEvent(
  input: TelemetryInput,
): EngineeringTelemetryEvent {
  return {
    eventVersion: ENGINEERING_TELEMETRY_VERSION,
    type: input.type,
    mode: input.mode,
    occurredAt: assertIsoTimestamp(input.occurredAt),
    details: sanitizeDetails(input.details ?? {}),
  };
}

export async function captureEngineeringTelemetry(
  input: TelemetryInput,
  sink?: TelemetrySink,
): Promise<
  | { captured: true; event: EngineeringTelemetryEvent }
  | {
      captured: false;
      error: "telemetry_validation_failed" | "telemetry_sink_failed";
    }
> {
  let event: EngineeringTelemetryEvent;
  try {
    event = buildEngineeringTelemetryEvent(input);
  } catch {
    return { captured: false, error: "telemetry_validation_failed" };
  }

  try {
    dispatchBrowserTelemetryEvent(event);
    await sink?.(event);
    return { captured: true, event };
  } catch {
    return { captured: false, error: "telemetry_sink_failed" };
  }
}

export function classifyTelemetryFailure(error: unknown): TelemetryReason {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    FAILURE_REASON_PATTERNS.find(({ patterns }) =>
      patterns.some((pattern) => message.includes(pattern)),
    )?.reason ?? "unknown"
  );
}

function sanitizeDetails(details: Record<string, unknown>): TelemetryDetails {
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(details)) {
    assertKnownDetailKey(key);
    if (value === undefined) continue;
    sanitized[key] = sanitizeValue(key, value);
  }
  return sanitized as TelemetryDetails;
}

function assertKnownDetailKey(key: string) {
  if (!ALLOWED_DETAIL_KEY_SET.has(key) || FORBIDDEN_DETAIL_KEYS.test(key)) {
    throw new Error(`Unknown telemetry field: ${key}`);
  }
}

function sanitizeValue(key: string, value: unknown) {
  if (typeof value === "string") {
    if (!SAFE_STRING.test(value)) {
      throw new Error(`Unsafe telemetry value for ${key}`);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Unsafe telemetry value for ${key}`);
    }
    return value;
  }
  if (typeof value === "boolean") return value;
  throw new Error(`Unsafe telemetry value for ${key}`);
}

function assertIsoTimestamp(value: string) {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("Invalid telemetry timestamp");
  }
  return value;
}

function dispatchBrowserTelemetryEvent(event: EngineeringTelemetryEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ENGINEERING_TELEMETRY_BROWSER_EVENT, { detail: event }),
  );
}
