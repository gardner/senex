import { describe, expect, it, vi } from "vitest";

import {
  buildEngineeringTelemetryEvent,
  captureEngineeringTelemetry,
  classifyTelemetryFailure,
  type EngineeringTelemetryEvent,
} from "@/lib/telemetry";

describe("engineering telemetry events", () => {
  it("builds minimal allowlisted events without identifiers or raw measurements", () => {
    const event = buildEngineeringTelemetryEvent({
      type: "import_failure",
      mode: "offline",
      occurredAt: "2026-07-05T00:00:00.000Z",
      details: {
        operation: "preview",
        reason: "validation_failed",
        localSchemaVersion: 3,
        appVersion: "0.1.0",
      },
    });

    expect(event).toEqual({
      eventVersion: "engineering-telemetry-v1",
      type: "import_failure",
      mode: "offline",
      occurredAt: "2026-07-05T00:00:00.000Z",
      details: {
        operation: "preview",
        reason: "validation_failed",
        localSchemaVersion: 3,
        appVersion: "0.1.0",
      },
    });
    expect(JSON.stringify(event)).not.toMatch(
      /session_|task_run_|score_|trial_|study_|account_|@|rt_ms|payload/i,
    );
  });

  it("rejects unknown event details instead of silently leaking sensitive fields", () => {
    expect(() =>
      buildEngineeringTelemetryEvent({
        type: "account_sync_failure",
        mode: "signed_in",
        occurredAt: "2026-07-05T00:00:00.000Z",
        details: {
          operation: "submit",
          reason: "network_or_server_error",
          accountId: "user_123",
        },
      }),
    ).toThrow(/unknown telemetry field/i);
  });

  it("classifies errors into coarse reasons without preserving raw messages", () => {
    expect(
      classifyTelemetryFailure(
        new Error(
          "Payload accountId does not match signed-in account user_123",
        ),
      ),
    ).toBe("permission_denied");
    expect(
      classifyTelemetryFailure(
        new Error("Anonymous reporting history requires explicit account link"),
      ),
    ).toBe("consent_required");
    expect(classifyTelemetryFailure(new Error("email alice@example.com"))).toBe(
      "unknown",
    );
  });

  it("does not let telemetry sink failures block the caller", async () => {
    const sink = vi.fn<(event: EngineeringTelemetryEvent) => Promise<void>>(
      async () => {
        throw new Error("sink offline");
      },
    );

    await expect(
      captureEngineeringTelemetry(
        {
          type: "test_abort",
          mode: "offline",
          occurredAt: "2026-07-05T00:00:00.000Z",
          details: {
            taskId: "symbol_match",
            reason: "tab_hidden",
            localSchemaVersion: 3,
          },
        },
        sink,
      ),
    ).resolves.toMatchObject({
      captured: false,
      error: "telemetry_sink_failed",
    });
    expect(sink).toHaveBeenCalledTimes(1);
  });
});
