import type * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SMALL_CELL_SUPPRESSED_VALUE } from "@/lib/admin/data-quality-privacy";
import type { DataQualityDashboard } from "@/lib/admin/data-quality";

export function DistributionCard({
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
            formatDistributionValue(row.value),
            row.count,
            formatPercent(row.share),
          ])}
        />
      </CardContent>
    </Card>
  );
}

export function MetricCard({
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

export function Guardrail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

export function Table({
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

export function formatExternalRelease(
  value: DataQualityDashboard["privacy"]["externalRelease"],
) {
  return value === "blocked_small_cohort"
    ? "Blocked: small cohort"
    : "Review required";
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDistributionValue(value: string) {
  return value === SMALL_CELL_SUPPRESSED_VALUE
    ? "Small cell suppressed"
    : value;
}
