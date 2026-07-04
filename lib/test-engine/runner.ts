import type { TaskDefinition } from "./types";

export type RunnerStatus =
  | "setup"
  | "instructions"
  | "practice"
  | "ready"
  | "running_trial"
  | "between_trials"
  | "paused"
  | "interrupted"
  | "completed"
  | "saved"
  | "abandoned";

export interface RunnerState {
  status: RunnerStatus;
  taskId: string;
  taskVersion: string;
  currentTrialIndex: number;
  accessibleStatus: string;
  interruptionReason?: string;
}

export type RunnerEvent =
  | { type: "showInstructions"; at: number; reason?: string }
  | { type: "startPractice"; at: number; reason?: string }
  | { type: "finishPractice"; at: number; reason?: string }
  | { type: "markReady"; at: number; reason?: string }
  | { type: "startTrial"; at: number; reason?: string }
  | { type: "recordResponse"; at: number; reason?: string }
  | { type: "nextTrial"; at: number; reason?: string }
  | { type: "pause"; at: number; reason?: string }
  | { type: "resume"; at: number; reason?: string }
  | { type: "interrupt"; at: number; reason?: string }
  | { type: "complete"; at: number; reason?: string }
  | { type: "save"; at: number; reason?: string }
  | { type: "abandon"; at: number; reason?: string };

type RunnerEventType = RunnerEvent["type"];

const TRANSITIONS: Record<
  RunnerStatus,
  Partial<Record<RunnerEventType, RunnerStatus>>
> = {
  setup: { showInstructions: "instructions" },
  instructions: { startPractice: "practice", markReady: "ready" },
  practice: { finishPractice: "ready" },
  ready: { markReady: "ready", startTrial: "running_trial" },
  running_trial: {
    recordResponse: "between_trials",
    complete: "completed",
  },
  between_trials: { nextTrial: "ready", complete: "completed" },
  paused: { resume: "ready" },
  interrupted: { save: "saved", abandon: "abandoned" },
  completed: { save: "saved" },
  saved: {},
  abandoned: {},
};

const TERMINAL_STATUSES = new Set<RunnerStatus>(["saved", "abandoned"]);

export function createInitialRunnerState(
  definition: TaskDefinition,
): RunnerState {
  return {
    status: "setup",
    taskId: definition.taskId,
    taskVersion: definition.taskVersion,
    currentTrialIndex: -1,
    accessibleStatus: "Test setup is ready.",
  };
}

export function advanceRunner(
  state: RunnerState,
  event: RunnerEvent,
): RunnerState {
  const nextStatus = transition(state.status, event.type);
  const nextIndex =
    event.type === "startTrial"
      ? state.currentTrialIndex + 1
      : state.currentTrialIndex;
  return {
    ...state,
    status: nextStatus,
    currentTrialIndex: nextIndex,
    accessibleStatus: accessibleStatus(nextStatus, event.reason),
    interruptionReason:
      event.type === "interrupt" ? event.reason : state.interruptionReason,
  };
}

function transition(status: RunnerStatus, event: RunnerEventType) {
  const direct = TRANSITIONS[status][event];
  if (direct) return direct;
  if (!TERMINAL_STATUSES.has(status) && event === "interrupt")
    return "interrupted";
  if (!TERMINAL_STATUSES.has(status) && event === "pause") return "paused";
  throw new Error(`Invalid runner transition from ${status} via ${event}`);
}

function accessibleStatus(status: RunnerStatus, reason?: string) {
  if (status === "interrupted")
    return `Test interrupted: ${reason ?? "unknown"}.`;
  if (status === "running_trial") return "Trial running.";
  if (status === "between_trials") return "Response recorded.";
  return `Test ${status.replace("_", " ")}.`;
}
