import type * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DataQualityDashboard } from "@/lib/admin/data-quality";

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

function DistributionCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ value: string; count: number; share: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{title}</CardTitle>
        <CardDescription>Session context distribution.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table
          empty="No session context has been submitted."
          headers={["Value", "Count", "Share"]}
          rows={data.map((row) => [
            row.value,
            row.count,
            formatPercent(row.share),
          ])}
        />
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle as="h2">{label}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            {headers.map((header) => (
              <th key={header} className="py-2 pr-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
