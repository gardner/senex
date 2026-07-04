import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DataQualityDashboard } from "@/lib/admin/data-quality";

import {
  DistributionCard,
  formatExternalRelease,
  formatPercent,
  Guardrail,
  MetricCard,
  Table,
} from "./components";

export function DataQualityView({
  dashboard,
}: {
  dashboard: DataQualityDashboard;
}) {
  return (
    <>
      <section className="grid auto-rows-fr gap-4 md:grid-cols-4">
        <MetricCard
          label="Completion"
          value={formatPercent(dashboard.summary.sessionCompletionRate)}
          detail={`${dashboard.summary.completedSessions}/${dashboard.summary.sessions} sessions`}
        />
        <MetricCard
          label="Task runs"
          value={formatPercent(dashboard.summary.taskRunCompletionRate)}
          detail={`${dashboard.summary.completedTaskRuns}/${dashboard.summary.taskRuns} complete`}
        />
        <MetricCard
          label="Invalid trials"
          value={formatPercent(dashboard.summary.invalidTrialRate)}
          detail={`${dashboard.summary.invalidTrialEvents}/${dashboard.summary.trialEvents} flagged`}
        />
        <MetricCard
          label="Upload retries"
          value={dashboard.uploadRetries.pendingReview}
          detail={`${dashboard.uploadRetries.failedUploads} failed uploads`}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Privacy guardrails</CardTitle>
          <CardDescription>
            Aggregate-only view with small-cell checks for context
            distributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <Guardrail
            label="External release"
            value={formatExternalRelease(dashboard.privacy.externalRelease)}
          />
          <Guardrail
            label="Minimum cohort"
            value={`${dashboard.privacy.minimumCohortSize} submissions`}
          />
          <Guardrail
            label="Suppressed cells"
            value={dashboard.privacy.suppressedDistributionCells}
          />
        </CardContent>
      </Card>
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Drop-off by test</CardTitle>
            <CardDescription>
              Started task runs compared with completed runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              empty="No task runs have been submitted."
              headers={["Task", "Started", "Complete", "Drop-off"]}
              rows={dashboard.dropOffByTest.map((row) => [
                row.taskId,
                row.startedRuns,
                row.completedRuns,
                formatPercent(row.dropOffRate),
              ])}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">Median task duration</CardTitle>
            <CardDescription>
              Completed task duration grouped by task.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              empty="No completed task durations are available."
              headers={["Task", "Runs", "Median duration"]}
              rows={dashboard.medianTaskDurationByTask.map((row) => [
                row.taskId,
                row.completedRuns,
                `${row.medianDurationSeconds}s`,
              ])}
            />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Quality flags</CardTitle>
            <CardDescription>
              Session, task, score, and trial flags by frequency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              empty="No quality flags have been recorded."
              headers={["Flag", "Count"]}
              rows={dashboard.qualityFlagFrequency.map((row) => [
                row.flag,
                row.count,
              ])}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">Invalid trial rate by task</CardTitle>
            <CardDescription>
              Trial events with invalid-quality event flags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              empty="No trial-level events have been submitted."
              headers={["Task", "Trials", "Invalid", "Rate"]}
              rows={dashboard.invalidTrialsByTask.map((row) => [
                row.taskId,
                row.trialEvents,
                row.invalidTrialEvents,
                formatPercent(row.invalidTrialRate),
              ])}
            />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <DistributionCard
          title="Device distribution"
          data={dashboard.deviceDistribution}
        />
        <DistributionCard
          title="Input distribution"
          data={dashboard.inputDistribution}
        />
        <Card>
          <CardHeader>
            <CardTitle as="h2">Retry state</CardTitle>
            <CardDescription>Failed upload retry state counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              empty="No failed uploads have been recorded."
              headers={["State", "Count"]}
              rows={dashboard.uploadRetries.retryStateFrequency.map((row) => [
                row.retryState,
                row.count,
              ])}
            />
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Missing questionnaire fields</CardTitle>
          <CardDescription>
            Required reporting fields missing from consented questionnaire
            uploads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            empty="No missing required questionnaire fields."
            headers={["Questionnaire", "Field", "Missing", "Completion"]}
            rows={dashboard.missingQuestionnaireFields.map((row) => [
              row.questionnaireId,
              row.label,
              row.missingCount,
              formatPercent(row.completionRate),
            ])}
          />
        </CardContent>
      </Card>
    </>
  );
}
