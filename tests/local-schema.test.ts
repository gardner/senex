import { describe, expect, it } from "vitest";

import {
  assertLocalProfile,
  assertLocalSession,
  assertScoreRecord,
  LOCAL_SCHEMA_VERSION,
} from "@/lib/local/schema";

const iso = "2026-07-04T00:00:00.000Z";

describe("local schema validation", () => {
  it("accepts mode-neutral profile and session records", () => {
    expect(() =>
      assertLocalProfile({
        profileId: "profile_1",
        mode: "offline",
        createdAt: iso,
        updatedAt: iso,
        schemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: "0.1.0",
      }),
    ).not.toThrow();

    expect(() =>
      assertLocalSession({
        sessionId: "session_1",
        profileId: "profile_1",
        startedAt: iso,
        completedAt: null,
        cadence: "daily",
        contextSnapshot: { sleepHours: 7 },
        qualityFlags: [],
        schemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: "0.1.0",
      }),
    ).not.toThrow();
  });

  it("rejects malformed records loudly", () => {
    expect(() =>
      assertLocalProfile({
        profileId: "",
        mode: "offline",
        createdAt: iso,
        updatedAt: iso,
        schemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: "0.1.0",
      }),
    ).toThrow(/profileId/);

    expect(() =>
      assertLocalSession({
        sessionId: "session_1",
        profileId: "profile_1",
        startedAt: "not a timestamp",
        completedAt: null,
        cadence: "daily",
        contextSnapshot: {},
        qualityFlags: [],
        schemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: "0.1.0",
      }),
    ).toThrow(/startedAt/);
  });

  it("keeps scores queryable by durable dimensions", () => {
    expect(() =>
      assertScoreRecord({
        scoreId: "score_1",
        sessionId: "session_1",
        taskRunId: "task_run_1",
        domain: "reaction_speed",
        metricName: "median_rt_ms",
        rawValue: 412,
        normalizedValue: null,
        confidence: 0.9,
        qualityFlags: ["baseline_forming"],
        schemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: "0.1.0",
      }),
    ).not.toThrow();

    expect(() =>
      assertScoreRecord({
        scoreId: "score_1",
        sessionId: "session_1",
        taskRunId: "task_run_1",
        domain: "reaction_speed",
        metricName: "median_rt_ms",
        rawValue: Number.NaN,
        normalizedValue: null,
        confidence: 0.9,
        qualityFlags: [],
        schemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: "0.1.0",
      }),
    ).toThrow(/rawValue/);
  });
});
