import type { QualityFlag } from "./types";

export interface PointerInput {
  method: "mouse" | "pen" | "touch" | "pointer";
  button: number;
}

export function measureReactionTime(
  stimulusTime: number,
  responseTime: number,
) {
  const rtMs = responseTime - stimulusTime;
  if (!Number.isFinite(rtMs) || rtMs < 0) {
    throw new Error("Reaction time cannot be negative");
  }
  return rtMs;
}

export function buildPointerInput(input: {
  pointerType?: string;
  button: number;
}): PointerInput {
  const pointerType = input.pointerType;
  const method =
    pointerType === "mouse" || pointerType === "pen" || pointerType === "touch"
      ? pointerType
      : "pointer";
  return { method, button: input.button };
}

export function buildVisibilityFlag(input: {
  hidden: boolean;
  at: number;
}): QualityFlag {
  return {
    code: input.hidden ? "tab_hidden" : "tab_visible",
    level: "task_run",
    severity: input.hidden ? "warning" : "info",
    message: input.hidden
      ? "The tab was hidden during the task."
      : "The tab became visible.",
    excludeFromScoring: false,
    at: input.at,
  };
}
