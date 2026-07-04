import type {
  AnonymousReportingPayload,
  AnonymousSessionContext,
  AnonymousSessionSummary,
  AnonymousTaskRunSummary,
} from "@/lib/anonymous-reporting";
import { normalizedQualityFlag } from "@/lib/admin/data-quality-flags";
import type { TrialEventRecord } from "@/lib/local/schema";
import { buildMissingQuestionnaireFields } from "@/lib/admin/data-quality-questionnaires";

export type RetryStateRow = { retry_state: string; count: number };

type TaskCounts = {
  taskId: string;
  startedRuns: number;
  completedRuns: number;
};

export function buildDataQualityDashboard(
  payloads: AnonymousReportingPayload[],
  retryRows: RetryStateRow[],
  generatedAt: string,
) {
  const records = flattenPayloads(payloads);
  const taskByRunId = new Map(
    records.taskRuns.map((taskRun) => [taskRun.taskRunId, taskRun]),
  );
  const completedSessions = records.sessions.filter(
    (session) => session.completedAt !== null,
  ).length;
  const completedTaskRuns = records.taskRuns.filter(
    (taskRun) => taskRun.completedAt !== null,
  ).length;
  const invalidTrialEvents = records.trialEvents.filter(isInvalidTrial).length;
  const missingQuestionnaireFields = buildMissingQuestionnaireFields(payloads);

  return {
    status: "ok" as const,
    generatedAt,
    summary: {
      acceptedSubmissions: payloads.length,
      sessions: records.sessions.length,
      completedSessions,
      sessionCompletionRate: rate(completedSessions, records.sessions.length),
      taskRuns: records.taskRuns.length,
      completedTaskRuns,
      taskRunCompletionRate: rate(completedTaskRuns, records.taskRuns.length),
      trialEvents: records.trialEvents.length,
      invalidTrialEvents,
      invalidTrialRate: rate(invalidTrialEvents, records.trialEvents.length),
      missingQuestionnaireFields: missingQuestionnaireFields.length,
    },
    dropOffByTest: buildDropOffByTest(records.taskRuns),
    invalidTrialsByTask: buildInvalidTrialsByTask(
      records.trialEvents,
      taskByRunId,
    ),
    medianTaskDurationByTask: buildMedianDurations(records.taskRuns),
    qualityFlagFrequency: buildQualityFlagFrequency(records),
    deviceDistribution: buildContextDistribution(
      records.sessions,
      records.sessionContext,
      [["deviceType"], ["deviceClass"], ["device", "type"], ["device"]],
    ),
    inputDistribution: buildContextDistribution(
      records.sessions,
      records.sessionContext,
      [["inputMethod"], ["inputMode"], ["input", "method"], ["pointerType"]],
    ),
    missingQuestionnaireFields,
    uploadRetries: buildUploadRetries(retryRows),
  };
}

function flattenPayloads(payloads: AnonymousReportingPayload[]) {
  return {
    sessions: payloads.flatMap(
      (payload) => payload.data.sessionSummaries ?? [],
    ),
    taskRuns: payloads.flatMap(
      (payload) => payload.data.taskRunSummaries ?? [],
    ),
    scores: payloads.flatMap((payload) => payload.data.scores ?? []),
    trialEvents: payloads.flatMap((payload) => payload.data.trialEvents ?? []),
    sessionContext: payloads.flatMap(
      (payload) => payload.data.sessionContext ?? [],
    ),
  };
}

function buildDropOffByTest(taskRuns: AnonymousTaskRunSummary[]) {
  return [...groupTaskRuns(taskRuns).values()]
    .map((task) => {
      const droppedRuns = task.startedRuns - task.completedRuns;
      return {
        ...task,
        droppedRuns,
        completionRate: rate(task.completedRuns, task.startedRuns),
        dropOffRate: rate(droppedRuns, task.startedRuns),
      };
    })
    .sort(byCountDescThenName("droppedRuns", "taskId"));
}

function buildInvalidTrialsByTask(
  trialEvents: TrialEventRecord[],
  taskByRunId: Map<string, AnonymousTaskRunSummary>,
) {
  const byTask = new Map<
    string,
    { taskId: string; trialEvents: number; invalidTrialEvents: number }
  >();
  for (const event of trialEvents) {
    const taskId = taskByRunId.get(event.taskRunId)?.taskId ?? "unknown";
    const current = byTask.get(taskId) ?? {
      taskId,
      trialEvents: 0,
      invalidTrialEvents: 0,
    };
    current.trialEvents += 1;
    if (isInvalidTrial(event)) current.invalidTrialEvents += 1;
    byTask.set(taskId, current);
  }
  return [...byTask.values()]
    .map((task) => ({
      ...task,
      invalidTrialRate: rate(task.invalidTrialEvents, task.trialEvents),
    }))
    .sort(byCountDescThenName("invalidTrialEvents", "taskId"));
}

function buildMedianDurations(taskRuns: AnonymousTaskRunSummary[]) {
  const secondsByTask = new Map<string, number[]>();
  for (const taskRun of taskRuns) {
    if (taskRun.completedAt === null) continue;
    const seconds = secondsBetween(taskRun.startedAt, taskRun.completedAt);
    if (seconds === null) continue;
    const durations = secondsByTask.get(taskRun.taskId) ?? [];
    durations.push(seconds);
    secondsByTask.set(taskRun.taskId, durations);
  }
  return [...secondsByTask.entries()]
    .map(([taskId, durations]) => ({
      taskId,
      completedRuns: durations.length,
      medianDurationSeconds: roundNumber(median(durations)),
    }))
    .sort(byCountDescThenName("completedRuns", "taskId"));
}

function buildQualityFlagFrequency(
  records: ReturnType<typeof flattenPayloads>,
) {
  const flags = new Map<string, number>();
  for (const session of records.sessions) {
    incrementQualityFlags(flags, session.qualityFlags);
  }
  for (const taskRun of records.taskRuns) {
    incrementQualityFlags(flags, taskRun.qualityFlags);
  }
  for (const score of records.scores) {
    incrementQualityFlags(flags, score.qualityFlags);
  }
  for (const trial of records.trialEvents) {
    incrementQualityFlags(flags, trial.eventFlags);
  }
  return [...flags.entries()]
    .map(([flag, count]) => ({ flag, count }))
    .sort(byCountDescThenName("count", "flag"));
}

function buildContextDistribution(
  sessions: AnonymousSessionSummary[],
  contexts: AnonymousSessionContext[],
  paths: string[][],
) {
  const bySession = new Map(
    contexts.map((context) => [context.sessionId, context.contextSnapshot]),
  );
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const snapshot = bySession.get(session.sessionId);
    increment(counts, snapshot ? contextString(snapshot, paths) : "unknown");
  }
  return countedValues(counts, sessions.length);
}

function buildUploadRetries(rows: RetryStateRow[]) {
  const retryStateFrequency = rows.map((row) => ({
    retryState: row.retry_state,
    count: Number(row.count),
  }));
  return {
    failedUploads: retryStateFrequency.reduce(
      (total, row) => total + row.count,
      0,
    ),
    pendingReview:
      retryStateFrequency.find((row) => row.retryState === "needs_review")
        ?.count ?? 0,
    retryStateFrequency,
  };
}

function groupTaskRuns(taskRuns: AnonymousTaskRunSummary[]) {
  const byTask = new Map<string, TaskCounts>();
  for (const taskRun of taskRuns) {
    const current = byTask.get(taskRun.taskId) ?? {
      taskId: taskRun.taskId,
      startedRuns: 0,
      completedRuns: 0,
    };
    current.startedRuns += 1;
    if (taskRun.completedAt !== null) current.completedRuns += 1;
    byTask.set(taskRun.taskId, current);
  }
  return byTask;
}

function isInvalidTrial(event: TrialEventRecord) {
  return event.eventFlags.some((flag) => normalizedQualityFlag(flag) !== null);
}

function incrementQualityFlags(counts: Map<string, number>, values: string[]) {
  for (const value of values) {
    const safeFlag = normalizedQualityFlag(value);
    if (safeFlag) increment(counts, safeFlag);
  }
}

function increment(counts: Map<string, number>, value: string) {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function countedValues(counts: Map<string, number>, denominator: number) {
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      share: rate(count, denominator),
    }))
    .sort(byCountDescThenName("count", "value"));
}

function contextString(snapshot: Record<string, unknown>, paths: string[][]) {
  for (const path of paths) {
    const value = nestedValue(snapshot, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().toLowerCase();
    }
  }
  return "unknown";
}

function nestedValue(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>(
    (current, key) =>
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    value,
  );
}

function secondsBetween(start: string, end: string) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  return (endMs - startMs) / 1000;
}

function median(values: number[]) {
  const sorted = values.toSorted((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : roundNumber(numerator / denominator);
}

function roundNumber(value: number) {
  return Number(value.toFixed(4));
}

function byCountDescThenName<T extends Record<string, string | number>>(
  countKey: keyof T,
  nameKey: keyof T,
) {
  return (left: T, right: T) => {
    const byCount = Number(right[countKey]) - Number(left[countKey]);
    if (byCount !== 0) return byCount;
    return String(left[nameKey]).localeCompare(String(right[nameKey]));
  };
}
