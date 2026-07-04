import { describe, expect, it } from "vitest";

import publicPageSource from "../app/(public)/page.tsx?raw";
import anonymousReportingPanelSource from "../components/anonymous-reporting-panel.tsx?raw";
import offlineModePanelSource from "../components/offline-mode-panel.tsx?raw";
import telemetryDoc from "../docs/telemetry.md?raw";
import anonymousConsentSource from "../lib/anonymous-reporting/consent.ts?raw";
import anonymousPayloadSource from "../lib/anonymous-reporting/payload.ts?raw";
import wranglerConfigSource from "../wrangler.jsonc?raw";

const browserSourceFiles = [
  { file: "app/(public)/page.tsx", text: publicPageSource },
  {
    file: "components/anonymous-reporting-panel.tsx",
    text: anonymousReportingPanelSource,
  },
  { file: "components/offline-mode-panel.tsx", text: offlineModePanelSource },
  {
    file: "lib/anonymous-reporting/consent.ts",
    text: anonymousConsentSource,
  },
  {
    file: "lib/anonymous-reporting/payload.ts",
    text: anonymousPayloadSource,
  },
] as const;

const disallowedBrowserTelemetryPatterns = [
  /\bnavigator\.sendBeacon\b/i,
  /\bkeepalive\s*:\s*true\b/i,
  /\bposthog\b/i,
  /\bsegment\b/i,
  /\blogrocket\b/i,
  /\bsentry\b/i,
  /\bdatadog\b/i,
  /\bhoneycomb\b/i,
  /\bgoogle-analytics\b/i,
  /\bgtag\s*\(/i,
];

describe("telemetry boundaries", () => {
  it("keeps the telemetry boundary reviewed and committed", () => {
    expect(telemetryDoc).toContain("Product analytics != cognitive test data");
    expect(telemetryDoc).toContain("Offline Mode");
    expect(telemetryDoc).toContain("Anonymous Reporting Mode");
    expect(telemetryDoc).toContain("Signed-In Mode");
    expect(telemetryDoc).toContain("Forbidden Telemetry Payloads");
    expect(telemetryDoc).toContain("Cloudflare Workers observability");
    expect(telemetryDoc).toContain("Workers Analytics Engine");
    expect(telemetryDoc).toContain("MDN sendBeacon");
  });

  it("keeps Offline Mode free of browser-side telemetry transports by default", () => {
    const violations = browserSourceFiles.flatMap((file) =>
      disallowedBrowserTelemetryPatterns.flatMap((pattern) =>
        [...file.text.matchAll(new RegExp(pattern, "gi"))].map(
          (match) => `${file.file}: ${match[0]}`,
        ),
      ),
    );

    expect(violations).toEqual([]);
  });

  it("documents server observability as operational logging, not product analytics", () => {
    expect(wranglerConfigSource).toContain('"observability"');
    expect(wranglerConfigSource).toContain('"enabled": true');
    expect(telemetryDoc).toContain(
      "Worker logs are operational service telemetry",
    );
    expect(telemetryDoc).toContain("raw cognitive test data");
    expect(telemetryDoc).toContain("questionnaire answers");
    expect(telemetryDoc).toContain("stable study identifiers");
  });
});
