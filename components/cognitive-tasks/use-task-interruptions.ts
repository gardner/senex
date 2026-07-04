"use client";

import { useCallback, useEffect, useRef } from "react";

import { LOCAL_APP_VERSION, LOCAL_SCHEMA_VERSION } from "@/lib/local/schema";
import { captureEngineeringTelemetry } from "@/lib/telemetry";
import { buildVisibilityFlag } from "@/lib/test-engine";

export function useTaskInterruptions(active: boolean, taskId: string) {
  const flagCodes = useRef<Set<string>>(new Set());

  const resetInterruptions = useCallback(() => {
    flagCodes.current = new Set();
  }, []);

  const readInterruptionCodes = useCallback(
    () => Array.from(flagCodes.current).toSorted(),
    [],
  );

  useEffect(() => {
    if (!active) return;

    const recordHiddenTab = () => {
      if (!document.hidden) return;
      const flag = buildVisibilityFlag({
        hidden: true,
        at: performance.now(),
      });
      if (flagCodes.current.has(flag.code)) return;
      flagCodes.current.add(flag.code);
      void captureEngineeringTelemetry({
        type: "test_abort",
        mode: "offline",
        occurredAt: new Date().toISOString(),
        details: {
          taskId,
          reason: "tab_hidden",
          visibilityState: "hidden",
          localSchemaVersion: LOCAL_SCHEMA_VERSION,
          appVersion: LOCAL_APP_VERSION,
        },
      });
    };

    document.addEventListener("visibilitychange", recordHiddenTab);
    recordHiddenTab();
    return () =>
      document.removeEventListener("visibilitychange", recordHiddenTab);
  }, [active, taskId]);

  return { readInterruptionCodes, resetInterruptions };
}
