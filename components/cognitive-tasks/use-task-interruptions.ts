"use client";

import { useCallback, useEffect, useRef } from "react";

import { buildVisibilityFlag } from "@/lib/test-engine";

export function useTaskInterruptions(active: boolean) {
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
      flagCodes.current.add(
        buildVisibilityFlag({
          hidden: true,
          at: performance.now(),
        }).code,
      );
    };

    document.addEventListener("visibilitychange", recordHiddenTab);
    recordHiddenTab();
    return () =>
      document.removeEventListener("visibilitychange", recordHiddenTab);
  }, [active]);

  return { readInterruptionCodes, resetInterruptions };
}
