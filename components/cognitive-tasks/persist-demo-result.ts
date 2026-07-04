import type { DemoTaskResult } from "@/lib/cognitive-tasks";
import {
  completeLocalSession,
  saveScore,
  saveTaskRun,
  saveTrialEvents,
  startLocalSession,
  type JsonObject,
} from "@/lib/local";

export async function persistDemoTaskResult(
  result: DemoTaskResult,
  completedAt = new Date().toISOString(),
) {
  const session = await startLocalSession({
    cadence: result.task.cadence,
    contextSnapshot: { demo: true, taskId: result.task.taskId },
    startedAt: completedAt,
  });
  const taskRun = await saveTaskRun({
    taskRunId: `task_run_${crypto.randomUUID()}`,
    sessionId: session.sessionId,
    taskId: result.task.taskId,
    taskVersion: result.task.taskVersion,
    stimulusPackId: result.stimulusPackId,
    stimulusSeed: result.seed,
    startedAt: completedAt,
    completedAt,
    summaryScore: result.summaryScore,
    qualityFlags: result.qualityFlags,
  });
  await saveTrialEvents(
    result.events.map((event, index) => ({
      trialEventId: `trial_${taskRun.taskRunId}_${index}`,
      taskRunId: taskRun.taskRunId,
      trialIndex: index,
      ...event,
    })),
  );
  await Promise.all(
    numericMetrics(result.summaryScore).map(([metricName, rawValue]) =>
      saveScore({
        scoreId: `score_${taskRun.taskRunId}_${metricName}`,
        sessionId: session.sessionId,
        taskRunId: taskRun.taskRunId,
        domain: result.task.domain,
        metricName,
        rawValue,
        normalizedValue: null,
        confidence: result.confidence,
        qualityFlags: result.qualityFlags,
      }),
    ),
  );
  await completeLocalSession(session.sessionId, {
    completedAt,
    qualityFlags: result.qualityFlags,
  });
  return taskRun;
}

function numericMetrics(summaryScore: JsonObject) {
  return Object.entries(summaryScore).filter(
    (entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1]),
  );
}
