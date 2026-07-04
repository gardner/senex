import { LOCAL_SCHEMA_VERSION, type JsonObject, type JsonValue } from "./types";

export function asRecord(
  value: unknown,
  name: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function expectBase(record: Record<string, unknown>, name: string) {
  if (record.schemaVersion !== LOCAL_SCHEMA_VERSION) {
    fail(`${name}.schemaVersion must be ${LOCAL_SCHEMA_VERSION}`);
  }
  expectNonEmptyString(record, "appVersion", name);
}

export function expectNonEmptyString(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (typeof record[field] !== "string" || record[field].trim() === "") {
    fail(`${name}.${field} must be a non-empty string`);
  }
}

export function expectStringOrNull(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (record[field] !== null && typeof record[field] !== "string") {
    fail(`${name}.${field} must be a string or null`);
  }
}

export function expectEnum(
  record: Record<string, unknown>,
  field: string,
  values: string[],
  name: string,
) {
  if (typeof record[field] !== "string" || !values.includes(record[field])) {
    fail(`${name}.${field} must be one of ${values.join(", ")}`);
  }
}

export function expectIso(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (
    typeof record[field] !== "string" ||
    Number.isNaN(Date.parse(record[field]))
  ) {
    fail(`${name}.${field} must be an ISO timestamp`);
  }
}

export function expectNullableIso(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (record[field] !== null) expectIso(record, field, name);
}

export function expectFiniteNumber(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (typeof record[field] !== "number" || !Number.isFinite(record[field])) {
    fail(`${name}.${field} must be a finite number`);
  }
}

export function expectNullableNumber(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (record[field] !== null) expectFiniteNumber(record, field, name);
}

export function expectInteger(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (!Number.isInteger(record[field]))
    fail(`${name}.${field} must be an integer`);
}

export function expectBooleanOrNull(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (record[field] !== null && typeof record[field] !== "boolean") {
    fail(`${name}.${field} must be boolean or null`);
  }
}

export function expectStringArray(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (
    !Array.isArray(record[field]) ||
    !record[field].every((item) => typeof item === "string")
  ) {
    fail(`${name}.${field} must be an array of strings`);
  }
}

export function expectJsonObject(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (!isPlainObject(record[field]) || !isJsonValue(record[field])) {
    fail(`${name}.${field} must be a JSON object`);
  }
}

export function expectJson(value: unknown, name: string) {
  if (!isJsonValue(value)) fail(`${name} must be JSON-compatible`);
}

export function fail(message: string): never {
  throw new TypeError(message);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isPlainObject(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
