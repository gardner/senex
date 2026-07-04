import { describe, expect, it } from "vitest";

import { buildOfflineDashboardSummary } from "@/lib/offline-dashboard";
import type { LocalSession, ScoreRecord } from "@/lib/local";

describe("offline dashboard summary", () => {
  it("shows conservative empty states without population comparisons", () => {
    const summary = buildOfflineDashboardSummary({
      now: "2026-07-04T12:00:00.000Z",
      sessions: [],
      scores: [],
    });

    expect(summary.todayStatus).toBe("not_started");
    expect(summary.baseline.state).toBe("not_started");
    expect(summary.completion.sevenDay.completedDays).toBe(0);
    expect(summary.domainCards[0]).toMatchObject({
      domain: "reaction_speed",
      status: "Not started",
      trend: "No personal baseline yet",
      confidenceLabel: "Insufficient data",
    });
    expect(summary.domainCards[0].detail).not.toMatch(/population|normal/i);
  });

  it("uses personal reaction-speed history for baseline and completion states", () => {
    const sessions = [
      session("session_1", "2026-07-01T09:00:00.000Z"),
      session("session_2", "2026-07-02T09:00:00.000Z"),
      session("session_3", "2026-07-04T09:00:00.000Z"),
      session("session_future", "2026-07-05T09:00:00.000Z"),
    ];
    const scores = [
      score("score_1", "session_1", 420, 0.9),
      score("score_2", "session_2", 400, 0.85),
      score("score_3", "session_3", 410, 0.9),
      score("score_future", "session_future", 300, 0.9),
    ];

    const summary = buildOfflineDashboardSummary({
      now: "2026-07-04T12:00:00.000Z",
      sessions,
      scores,
    });

    expect(summary.todayStatus).toBe("complete");
    expect(summary.baseline.state).toBe("usable");
    expect(summary.baseline.sampleCount).toBe(3);
    expect(summary.completion.sevenDay.completedDays).toBe(3);
    expect(summary.completion.thirtyDay.completedDays).toBe(3);
    expect(summary.domainCards[0]).toMatchObject({
      status: "Personal baseline usable",
      trend: "Recent mean 410 ms",
      confidenceLabel: "Usable",
      lastTestedAt: "2026-07-04T09:00:00.000Z",
    });
  });
});

function session(sessionId: string, completedAt: string): LocalSession {
  return {
    sessionId,
    profileId: "profile_1",
    startedAt: completedAt,
    completedAt,
    cadence: "daily",
    contextSnapshot: {},
    qualityFlags: [],
    schemaVersion: 1,
    appVersion: "0.1.0",
  };
}

function score(
  scoreId: string,
  sessionId: string,
  rawValue: number,
  confidence: number,
): ScoreRecord {
  return {
    scoreId,
    sessionId,
    taskRunId: `task_run_${scoreId}`,
    domain: "reaction_speed",
    metricName: "median_rt_ms",
    rawValue,
    normalizedValue: null,
    confidence,
    qualityFlags: [],
    schemaVersion: 1,
    appVersion: "0.1.0",
  };
}
