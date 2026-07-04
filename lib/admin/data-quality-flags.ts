export const REDACTED_QUALITY_FLAG = "unknown_quality_flag";

const QUALITY_FLAG_IDS = new Set([
  "anticipation",
  "baseline_forming",
  "demo_complete",
  "explicit_missed_response",
  "high_lapse_rate",
  "interrupted",
  "lapse",
  "missed_day",
  "missed_response",
  "missing_day",
  "multiple_responses",
  "no_response",
  "scheduled_missed_day",
  "self_reported_distraction",
  "self_reported_high_stress",
  "self_reported_illness",
  "self_reported_poor_sleep",
  "self_reported_sedating_substance",
  "tab_hidden",
  "too_fast",
  "too_few_valid_trials",
]);

const NON_QUALITY_EVENT_PREFIXES = ["input_", "phase_"];

export function normalizedQualityFlag(flag: string) {
  if (QUALITY_FLAG_IDS.has(flag)) return flag;
  if (NON_QUALITY_EVENT_PREFIXES.some((prefix) => flag.startsWith(prefix))) {
    return null;
  }
  return REDACTED_QUALITY_FLAG;
}
