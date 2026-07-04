"use client";

import { useEffect } from "react";

import { captureEngineeringTelemetry } from "@/lib/telemetry";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    void captureEngineeringTelemetry({
      type: "app_error",
      mode: "offline",
      occurredAt: new Date().toISOString(),
      details: {
        operation: "render",
        reason: "unknown",
        component: "global_error_boundary",
        digestPresent: Boolean(error.digest),
      },
    });
  }, [error.digest]);

  return (
    <html lang="en">
      <body>
        <main style={{ margin: "4rem auto", maxWidth: "36rem", padding: 24 }}>
          <h1>Something went wrong</h1>
          <p>Senex could not render this screen.</p>
          <button type="button" onClick={() => unstable_retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
