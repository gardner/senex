"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ResearchExportBody,
  ResearchExportSummary,
} from "@/lib/admin/research-export";
import type { ExportableResearchCategory } from "@/lib/admin/research-export-types";

const OPTIONS: Array<{ id: ExportableResearchCategory; label: string }> = [
  { id: "share_test_summaries", label: "Test summaries" },
  { id: "share_trial_level_data", label: "Trial-level data" },
  { id: "share_session_context", label: "Session context" },
  { id: "share_demographics", label: "Demographics" },
  { id: "share_questionnaires", label: "Questionnaires" },
];

export function ResearchExportView({
  initialExports,
}: {
  initialExports: ResearchExportSummary[];
}) {
  const [purpose, setPurpose] = React.useState("");
  const [approvalReference, setApprovalReference] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [anonymousStudyId, setAnonymousStudyId] = React.useState("");
  const [categories, setCategories] = React.useState<
    ExportableResearchCategory[]
  >(["share_test_summaries"]);
  const [result, setResult] = React.useState<ResearchExportBody | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const downloadHref = React.useMemo(
    () =>
      result
        ? `data:application/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(result, null, 2),
          )}`
        : "",
    [result],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/research-export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose,
          approvalReference,
          dataCategories: categories,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          anonymousStudyId: anonymousStudyId || undefined,
        }),
      });
      const body = (await response.json()) as ResearchExportBody & {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Export failed.");
      setResult(body);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : String(nextError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Create export</CardTitle>
          <CardDescription>
            Requires an approval reference before records are returned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <TextField label="Purpose" value={purpose} onChange={setPurpose} />
            <TextField
              label="Approval reference"
              value={approvalReference}
              onChange={setApprovalReference}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Date from"
                type="datetime-local"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <TextField
                label="Date to"
                type="datetime-local"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>
            <TextField
              label="Anonymous study ID filter"
              value={anonymousStudyId}
              onChange={setAnonymousStudyId}
              required={false}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Data categories</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {OPTIONS.map((option) => (
                  <label key={option.id} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categories.includes(option.id)}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setCategories((current) =>
                          checked
                            ? [...current, option.id]
                            : current.filter((id) => id !== option.id),
                        );
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={submitting || categories.length === 0}
            >
              {submitting ? "Creating..." : "Create export"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <ResultCard result={result} downloadHref={downloadHref} />
        <RecentExports exports={initialExports} />
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      <input
        className="border-input bg-background h-9 w-full rounded-md border px-3"
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function ResultCard({
  result,
  downloadHref,
}: {
  result: ResearchExportBody | null;
  downloadHref: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">
          {result ? "Export complete" : "Export result"}
        </CardTitle>
        <CardDescription>
          The manifest is stored in D1; the dataset is returned once here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3 text-sm">
            <Metric
              label="Submissions exported"
              value={result.manifest.counts.submissionsExported}
            />
            <Metric
              label="Records exported"
              value={result.manifest.counts.recordsExported}
            />
            <Metric label="Excluded" value={excludedCount(result)} />
            <a
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
              href={downloadHref}
              download={`${result.manifest.exportId}.json`}
            >
              Download JSON
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run an approved export to see manifest counts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentExports({ exports }: { exports: ResearchExportSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Recent export jobs</CardTitle>
        <CardDescription>
          Stored manifests for completed exports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {exports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No research exports have been created.
          </p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {exports.map((item) => (
              <div key={item.exportId} className="grid gap-1 p-3">
                <p className="font-medium">{item.approvalReference}</p>
                <p className="text-muted-foreground">
                  {item.recordCount} records from {item.submissionCount}{" "}
                  submissions
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div
      aria-label={`${label}: ${value}`}
      className="flex items-center justify-between gap-4 rounded-md border p-3"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function excludedCount(result: ResearchExportBody) {
  return (
    result.manifest.counts.excludedForConsent +
    result.manifest.counts.excludedForWithdrawal
  );
}
