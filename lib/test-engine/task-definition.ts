import type { TaskDefinition } from "./types";

const SEMVER = /^\d+\.\d+\.\d+$/;

export function defineTask(definition: TaskDefinition): TaskDefinition {
  assertTaskDefinition(definition);
  return Object.freeze({
    ...definition,
    instructions: { ...definition.instructions },
    practice: { ...definition.practice },
    stimulus: { ...definition.stimulus },
    response: { ...definition.response },
    scoring: { ...definition.scoring },
    qualityRules: { ...definition.qualityRules },
    accessibility: { ...definition.accessibility },
  });
}

export function assertTaskDefinition(
  value: unknown,
): asserts value is TaskDefinition {
  const definition = asRecord(value, "TaskDefinition");
  expectNonEmptyString(definition, "taskId", "TaskDefinition");
  expectSemver(definition, "taskVersion", "TaskDefinition");
  expectNonEmptyString(definition, "domain", "TaskDefinition");
  expectEnum(
    definition,
    "cadence",
    ["daily", "weekly", "monthly", "ad_hoc"],
    "TaskDefinition",
  );
  expectPositiveNumber(
    definition,
    "estimatedDurationSeconds",
    "TaskDefinition",
  );
  validateInstructions(definition.instructions);
  validatePractice(definition.practice);
  validateStimulus(definition.stimulus);
  validateResponse(definition.response);
  validateScoring(definition.scoring);
  validateQualityRules(definition.qualityRules);
  validateAccessibility(definition.accessibility);
}

function validateInstructions(value: unknown) {
  const instructions = asRecord(value, "TaskDefinition.instructions");
  expectNonEmptyString(instructions, "summary", "TaskDefinition.instructions");
  expectStringArray(instructions.steps, "TaskDefinition.instructions.steps");
}

function validatePractice(value: unknown) {
  const practice = asRecord(value, "TaskDefinition.practice");
  expectNonNegativeInteger(practice, "trialCount", "TaskDefinition.practice");
  expectRatio(
    practice.requiredAccuracy,
    "TaskDefinition.practice.requiredAccuracy",
  );
}

function validateStimulus(value: unknown) {
  const stimulus = asRecord(value, "TaskDefinition.stimulus");
  expectEnum(
    stimulus,
    "generation",
    ["seeded", "fixed"],
    "TaskDefinition.stimulus",
  );
  expectPositiveInteger(stimulus, "trialCount", "TaskDefinition.stimulus");
  expectEnum(
    stimulus,
    "seedPolicy",
    ["required", "optional", "fixed"],
    "TaskDefinition.stimulus",
  );
  if (typeof stimulus.alternateForms !== "boolean") {
    fail("TaskDefinition.stimulus.alternateForms must be a boolean");
  }
}

function validateResponse(value: unknown) {
  const response = asRecord(value, "TaskDefinition.response");
  expectStringArray(response.types, "TaskDefinition.response.types");
  const window = asRecord(
    response.validWindowMs,
    "TaskDefinition.response.validWindowMs",
  );
  expectPositiveNumber(window, "min", "TaskDefinition.response.validWindowMs");
  expectPositiveNumber(window, "max", "TaskDefinition.response.validWindowMs");
  if ((window.min as number) >= (window.max as number)) {
    fail("TaskDefinition valid response window min must be less than max");
  }
  if (response.allowedKeys !== undefined) {
    expectStringArray(
      response.allowedKeys,
      "TaskDefinition.response.allowedKeys",
    );
  }
}

function validateScoring(value: unknown) {
  const scoring = asRecord(value, "TaskDefinition.scoring");
  expectSemver(scoring, "scoringVersion", "TaskDefinition.scoring");
  expectNonEmptyString(scoring, "primaryMetric", "TaskDefinition.scoring");
  expectStringArray(scoring.metrics, "TaskDefinition.scoring.metrics");
  if (
    !(scoring.metrics as string[]).includes(scoring.primaryMetric as string)
  ) {
    fail("TaskDefinition.scoring.primaryMetric must exist in metrics");
  }
}

function validateQualityRules(value: unknown) {
  const rules = asRecord(value, "TaskDefinition.qualityRules");
  for (const field of ["anticipationMs", "lapseMs", "minValidTrials"]) {
    expectPositiveNumber(rules, field, "TaskDefinition.qualityRules");
  }
  expectRatio(rules.maxLapseRate, "TaskDefinition.qualityRules.maxLapseRate");
  if ((rules.anticipationMs as number) >= (rules.lapseMs as number)) {
    fail("TaskDefinition.qualityRules anticipationMs must be below lapseMs");
  }
}

function validateAccessibility(value: unknown) {
  const accessibility = asRecord(value, "TaskDefinition.accessibility");
  expectStringArray(
    accessibility.inputAlternatives,
    "TaskDefinition.accessibility.inputAlternatives",
  );
  expectStringArray(accessibility.notes, "TaskDefinition.accessibility.notes");
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function expectSemver(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (typeof record[field] !== "string" || !SEMVER.test(record[field])) {
    fail(`${name}.${field} must be a semantic version`);
  }
}

function expectNonEmptyString(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (typeof record[field] !== "string" || record[field].trim() === "") {
    fail(`${name}.${field} must be a non-empty string`);
  }
}

function expectEnum(
  record: Record<string, unknown>,
  field: string,
  values: string[],
  name: string,
) {
  if (typeof record[field] !== "string" || !values.includes(record[field])) {
    fail(`${name}.${field} must be one of ${values.join(", ")}`);
  }
}

function expectPositiveNumber(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (typeof record[field] !== "number" || record[field] <= 0) {
    fail(`${name}.${field} must be positive`);
  }
}

function expectPositiveInteger(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (!Number.isInteger(record[field]) || (record[field] as number) <= 0) {
    fail(`${name}.${field} must be a positive integer`);
  }
}

function expectNonNegativeInteger(
  record: Record<string, unknown>,
  field: string,
  name: string,
) {
  if (!Number.isInteger(record[field]) || (record[field] as number) < 0) {
    fail(`${name}.${field} must be a non-negative integer`);
  }
}

function expectRatio(value: unknown, name: string) {
  if (typeof value !== "number" || value < 0 || value > 1) {
    fail(`${name} must be between 0 and 1`);
  }
}

function expectStringArray(value: unknown, name: string) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string" && item.trim() !== "")
  ) {
    fail(`${name} must be a non-empty string array`);
  }
}

function fail(message: string): never {
  throw new TypeError(message);
}
