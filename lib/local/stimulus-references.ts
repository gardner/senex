import type { TaskRunRecord } from "./types";
import { fail } from "./validation-utils";

export interface StimulusReferenceLike {
  taskRunId: string;
  taskId: string;
  taskVersion: string;
  stimulusPackId: string;
  stimulusSeed: string;
}

export function stimulusReferenceForTask(
  taskRun: TaskRunRecord,
): StimulusReferenceLike {
  return {
    taskRunId: taskRun.taskRunId,
    taskId: taskRun.taskId,
    taskVersion: taskRun.taskVersion,
    stimulusPackId: taskRun.stimulusPackId,
    stimulusSeed: taskRun.stimulusSeed,
  };
}

export function assertStimulusReferencesMatchTaskRuns(
  taskRuns: TaskRunRecord[],
  references: StimulusReferenceLike[],
) {
  if (taskRuns.length !== references.length) failMismatch();
  const expected = new Map(
    taskRuns.map((taskRun) => [
      taskRun.taskRunId,
      stimulusReferenceForTask(taskRun),
    ]),
  );
  for (const reference of references) {
    const expectedReference = expected.get(reference.taskRunId);
    if (
      !expectedReference ||
      !sameStimulusReference(reference, expectedReference)
    ) {
      failMismatch();
    }
  }
}

function sameStimulusReference(
  left: StimulusReferenceLike,
  right: StimulusReferenceLike,
) {
  return (
    left.taskId === right.taskId &&
    left.taskVersion === right.taskVersion &&
    left.stimulusPackId === right.stimulusPackId &&
    left.stimulusSeed === right.stimulusSeed
  );
}

function failMismatch() {
  fail(
    "LocalExportEnvelope.data.stimulusReferences must match taskRuns exactly",
  );
}
