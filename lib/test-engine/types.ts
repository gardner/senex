export type TaskCadence = "daily" | "weekly" | "monthly" | "ad_hoc";
export type ResponseType = "keyboard" | "pointer" | "touch";
export type QualityFlagLevel = "trial" | "task_run" | "session";
export type QualitySeverity = "info" | "warning" | "exclude";

export interface TaskDefinition {
  taskId: string;
  taskVersion: string;
  domain: string;
  cadence: TaskCadence;
  estimatedDurationSeconds: number;
  instructions: {
    summary: string;
    steps: string[];
  };
  practice: {
    trialCount: number;
    requiredAccuracy: number;
  };
  stimulus: {
    generation: "seeded" | "fixed";
    trialCount: number;
    seedPolicy: "required" | "optional" | "fixed";
    alternateForms: boolean;
  };
  response: {
    types: ResponseType[];
    validWindowMs: { min: number; max: number };
    allowedKeys?: string[];
  };
  scoring: {
    scoringVersion: string;
    primaryMetric: string;
    metrics: string[];
  };
  qualityRules: {
    anticipationMs: number;
    lapseMs: number;
    minValidTrials: number;
    maxLapseRate: number;
  };
  accessibility: {
    inputAlternatives: ResponseType[];
    notes: string[];
  };
}

export interface QualityFlag {
  code: string;
  level: QualityFlagLevel;
  severity: QualitySeverity;
  message: string;
  excludeFromScoring: boolean;
  at?: number;
}

export interface TrialResult {
  trialIndex: number;
  expectedResponse: string;
  actualResponse: string | null;
  correct: boolean;
  responded: boolean;
  responseCount: number;
  rtMs: number | null;
}
