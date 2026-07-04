import type { QualityFlag, TaskDefinition, TrialResult } from "./types";

export function evaluateTrialQuality(
  trial: TrialResult,
  definition: TaskDefinition,
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  if (!trial.responded || trial.rtMs === null) {
    flags.push(
      flag("no_response", "trial", "exclude", "No response recorded."),
    );
  }
  if (trial.responseCount > 1) {
    flags.push(
      flag(
        "multiple_responses",
        "trial",
        "exclude",
        "Multiple responses recorded.",
      ),
    );
  }
  if (
    trial.rtMs !== null &&
    trial.rtMs < definition.qualityRules.anticipationMs
  ) {
    flags.push(
      flag("anticipation", "trial", "exclude", "Response was too fast."),
    );
  }
  if (trial.rtMs !== null && trial.rtMs > definition.qualityRules.lapseMs) {
    flags.push(
      flag("lapse", "trial", "exclude", "Response was unusually slow."),
    );
  }
  return flags;
}

export function evaluateTaskRunQuality(input: {
  definition: TaskDefinition;
  trials: TrialResult[];
  interruptions?: QualityFlag[];
}): QualityFlag[] {
  const trialFlags = input.trials.flatMap((trial) =>
    evaluateTrialQuality(trial, input.definition),
  );
  const validCount = input.trials.length - excludedTrialCount(trialFlags);
  const lapseRate =
    input.trials.length === 0
      ? 0
      : trialFlags.filter((flag) => flag.code === "lapse").length /
        input.trials.length;
  const flags = [...(input.interruptions ?? [])];
  if (validCount < input.definition.qualityRules.minValidTrials) {
    flags.push(
      flag(
        "too_few_valid_trials",
        "task_run",
        "warning",
        "Too few valid trials.",
      ),
    );
  }
  if (lapseRate > input.definition.qualityRules.maxLapseRate) {
    flags.push(
      flag("high_lapse_rate", "task_run", "warning", "High lapse rate."),
    );
  }
  return flags;
}

export function flag(
  code: string,
  level: QualityFlag["level"],
  severity: QualityFlag["severity"],
  message: string,
): QualityFlag {
  return {
    code,
    level,
    severity,
    message,
    excludeFromScoring: severity === "exclude",
  };
}

function excludedTrialCount(flags: QualityFlag[]) {
  return flags.filter(
    (flag) => flag.level === "trial" && flag.excludeFromScoring,
  ).length;
}
