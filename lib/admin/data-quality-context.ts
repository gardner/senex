import type {
  AnonymousSessionContext,
  AnonymousSessionSummary,
} from "@/lib/anonymous-reporting";
import { suppressSmallDistributionCells } from "@/lib/admin/data-quality-privacy";

export function buildContextDistribution(
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
  return suppressSmallDistributionCells(countedValues(counts, sessions.length));
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

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
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
