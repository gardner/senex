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
  ResearchExclusionEvent,
  ResearchExclusionResult,
} from "@/lib/admin/research-exclusions";

export function ResearchExclusionsView({
  initialEvents,
}: {
  initialEvents: ResearchExclusionEvent[];
}) {
  const [anonymousStudyId, setAnonymousStudyId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<ResearchExclusionResult | null>(
    null,
  );
  const [events, setEvents] = React.useState(initialEvents);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/research-exclusions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonymousStudyId, reason, action: "exclude" }),
      });
      const body = (await response.json()) as ResearchExclusionResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Exclusion failed.");
      setResult(body);
      await refreshEvents();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : String(nextError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshEvents() {
    const response = await fetch("/api/admin/research-exclusions", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      events?: ResearchExclusionEvent[];
    };
    setEvents(body.events ?? []);
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Mark future exclusion</CardTitle>
          <CardDescription>
            Requires the anonymous study ID and an audit reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <TextField
              label="Anonymous study ID"
              value={anonymousStudyId}
              onChange={setAnonymousStudyId}
            />
            <label className="block space-y-1 text-sm font-medium">
              <span>Audit reason</span>
              <textarea
                className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2"
                required
                value={reason}
                onChange={(event) => setReason(event.currentTarget.value)}
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording..." : "Mark excluded"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <ResultCard result={result} />
        <RecentEvents events={events} />
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      <input
        className="border-input bg-background h-9 w-full rounded-md border px-3"
        required
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function ResultCard({ result }: { result: ResearchExclusionResult | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">
          {result ? "Exclusion recorded" : "Exclusion result"}
        </CardTitle>
        <CardDescription>
          Future export eligibility changes are append-audited.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3 text-sm">
            <Metric
              label="Submissions matched"
              value={result.matchedSubmissions}
            />
            <Metric
              label="Submissions changed"
              value={result.changedSubmissions}
            />
            <p className="rounded-md border p-3 text-muted-foreground">
              {result.limitationNotice}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Submit an exclusion request to see the affected submission count.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEvents({ events }: { events: ResearchExclusionEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Recent exclusion audit</CardTitle>
        <CardDescription>Latest future-exclusion changes.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No research exclusions have been recorded.
          </p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {events.map((event) => (
              <div
                key={`${event.submissionKey}-${event.createdAt}-${event.nextStatus}`}
                className="grid gap-1 p-3"
              >
                <p className="font-medium">
                  {event.action} to {event.nextStatus}
                </p>
                <p className="text-muted-foreground">{event.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {event.anonymousStudyIdHash} / {event.createdAt}
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
