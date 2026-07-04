import type * as React from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getAnonymousIngestionStatus } from "@/lib/admin/ingestion-status";
import { requireAdmin } from "@/lib/auth/helpers";

export const metadata = { title: "Ingestion Status - Senex" };

export default async function AdminIngestionStatusPage() {
  const user = await requireAdmin();
  const status = await getAnonymousIngestionStatus();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          avatar: user.image ?? "",
          role: user.role,
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Ingestion status</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <section className="space-y-1">
            <h1 className="text-2xl font-medium tracking-normal">
              Anonymous reporting ingestion
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Operational status for anonymous research uploads. This view uses
              aggregate counts and redacted submission metadata only.
            </p>
          </section>
          <section className="grid auto-rows-fr gap-4 md:grid-cols-4">
            <MetricCard
              label="Accepted"
              value={status.summary.acceptedSubmissions}
              detail="Stored submissions"
            />
            <MetricCard
              label="Failed"
              value={status.summary.failedSubmissions}
              detail="Rejected uploads"
            />
            <MetricCard
              label="Pending review"
              value={status.summary.pendingReview}
              detail="Needs operator action"
            />
            <MetricCard
              label="Duplicates"
              value={status.summary.duplicateSubmissions}
              detail="Idempotent repeats"
            />
          </section>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Failures</CardTitle>
                <CardDescription>
                  Latest rejected uploads and the next operational action.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status.failures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No ingestion failures have been recorded.
                  </p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {status.failures.map((failure, index) => (
                      <div
                        key={`${failure.receivedAt}-${index}`}
                        className="grid gap-2 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone="danger">Rejected</StatusPill>
                          <StatusPill tone="warning">
                            {failure.retryState}
                          </StatusPill>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(failure.receivedAt)}
                          </span>
                        </div>
                        <p className="font-medium">{failure.error}</p>
                        <p className="text-muted-foreground">
                          {failure.actionRequired}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Schema {failure.localSchemaVersion} / app{" "}
                          {failure.appVersion}; {failure.categoryCount}{" "}
                          categories
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle as="h2">Schema versions</CardTitle>
                <CardDescription>
                  Accepted and failed uploads grouped by client schema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3 font-medium">Local</th>
                        <th className="py-2 pr-3 font-medium">App</th>
                        <th className="py-2 pr-3 text-right font-medium">
                          Accepted
                        </th>
                        <th className="py-2 text-right font-medium">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.schemaVersions.map((version) => (
                        <tr
                          key={`${version.localSchemaVersion}-${version.appVersion}`}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 pr-3 font-mono">
                            {version.localSchemaVersion}
                          </td>
                          <td className="py-2 pr-3 font-mono">
                            {version.appVersion}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {version.acceptedSubmissions}
                          </td>
                          <td className="py-2 text-right">
                            {version.failedSubmissions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Recent accepted submissions</CardTitle>
              <CardDescription>
                Redacted operational rows for stored anonymous uploads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3 font-medium">Received</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Schema</th>
                      <th className="py-2 pr-3 text-right font-medium">
                        Categories
                      </th>
                      <th className="py-2 text-right font-medium">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.recentSubmissions.map((submission, index) => (
                      <tr
                        key={`${submission.receivedAt}-${index}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-3">
                          {formatDate(submission.receivedAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusPill tone="success">
                            {submission.status}
                          </StatusPill>
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          {submission.localSchemaVersion} /{" "}
                          {submission.appVersion}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {submission.categoryCount}
                        </td>
                        <td className="py-2 text-right">
                          {submission.recordCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
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

function StatusPill({
  tone,
  children,
}: {
  tone: "danger" | "success" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    danger: "bg-destructive/10 text-destructive ring-destructive/20",
    success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}
