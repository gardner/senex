import { describe, expect, it } from "vitest";

import publicPageSource from "../app/(public)/page.tsx?raw";
import trialContactPanelSource from "../components/account/trial-contact-panel.tsx?raw";
import trialContactProfileFieldsSource from "../components/account/trial-contact-profile-fields.tsx?raw";
import cognitiveTaskPanelSource from "../components/cognitive-task-panel.tsx?raw";
import baselineSetupFormSource from "../components/offline/baseline-setup-form.tsx?raw";
import offlineDashboardViewSource from "../components/offline/offline-dashboard-view.tsx?raw";
import offlineModePanelSource from "../components/offline-mode-panel.tsx?raw";
import researchQuestionnairesPanelSource from "../components/research-questionnaires-panel.tsx?raw";
import copySafetyDoc from "../docs/copy-safety.md?raw";
import offlineDashboardSource from "../lib/offline-dashboard.ts?raw";
import questionnaireDefinitionsSource from "../lib/questionnaires/definitions.ts?raw";
import trialContactSchemaSource from "../lib/trial-contact/schema.ts?raw";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type LocalSession,
  type ScoreRecord,
} from "@/lib/local/schema";
import { buildOfflineDashboardSummary } from "@/lib/offline-dashboard";

const sourceFiles = [
  { file: "app/(public)/page.tsx", text: publicPageSource },
  {
    file: "components/account/trial-contact-panel.tsx",
    text: trialContactPanelSource,
  },
  {
    file: "components/account/trial-contact-profile-fields.tsx",
    text: trialContactProfileFieldsSource,
  },
  {
    file: "components/cognitive-task-panel.tsx",
    text: cognitiveTaskPanelSource,
  },
  {
    file: "components/offline/baseline-setup-form.tsx",
    text: baselineSetupFormSource,
  },
  {
    file: "components/offline/offline-dashboard-view.tsx",
    text: offlineDashboardViewSource,
  },
  { file: "components/offline-mode-panel.tsx", text: offlineModePanelSource },
  {
    file: "components/research-questionnaires-panel.tsx",
    text: researchQuestionnairesPanelSource,
  },
  { file: "lib/offline-dashboard.ts", text: offlineDashboardSource },
  {
    file: "lib/questionnaires/definitions.ts",
    text: questionnaireDefinitionsSource,
  },
  { file: "lib/trial-contact/schema.ts", text: trialContactSchemaSource },
] as const;

const forbiddenCopyPatterns = [
  /\b(?:dementia|alzheimer'?s?|adhd|concussion|depression|mci)\b/i,
  /\bmild cognitive impairment\b/i,
  /\bbrain age\b/i,
  /\bdisease[- ]risk\b/i,
  /\brisk prediction\b/i,
  /\b(?:dementia|alzheimer'?s?) (?:risk|warning|screen(?:ing)?|detect(?:ion)?)\b/i,
  /\bdecline detected\b/i,
  /\babnormal\b/i,
  /\bnormal range\b/i,
  /\bmedical[- ]grade\b/i,
  /\bclinical[- ]grade\b/i,
  /\bdiagnos(?:e|es|ed|is|tic)\b/i,
];

const allowedContexts = [
  "Diagnosed cognitive condition",
  "not diagnostic",
  "without diagnostic claims",
] as const;

describe("clinical-claim copy safety", () => {
  it("keeps the copy safety review checklist committed", () => {
    expect(copySafetyDoc).toContain("Allowed Language");
    expect(copySafetyDoc).toContain("Forbidden Language");
    expect(copySafetyDoc).toContain("Copy Review Checklist");
    expect(copySafetyDoc).toContain("FDA General Wellness");
    expect(copySafetyDoc).toContain("FTC Health Products Compliance Guidance");
    expect(copySafetyDoc).toContain("Medsafe");
  });

  it("keeps routine user-facing copy inside the non-diagnostic boundary", () => {
    const violations = sourceFiles.flatMap((file) =>
      forbiddenMatches(file.file, redactAllowedContexts(file.text)),
    );

    expect(violations).toEqual([]);
  });

  it("uses personal-baseline and sustained-change language for routine result copy", () => {
    const summary = buildOfflineDashboardSummary({
      now: "2026-07-05T00:00:00.000Z",
      sessions: [
        session("session_1", "2026-07-01T00:00:00.000Z"),
        session("session_2", "2026-07-02T00:00:00.000Z"),
        session("session_3", "2026-07-03T00:00:00.000Z"),
      ],
      scores: [
        score("score_1", "session_1", 410),
        score("score_2", "session_2", 412),
        score("score_3", "session_3", 415),
      ],
    });
    const resultCopy = JSON.stringify(summary);

    expect(resultCopy).toContain("Personal baseline");
    expect(resultCopy).toContain("Compared only with your own local history");
    expect(resultCopy).not.toMatch(/population|normal range|abnormal|risk/i);
  });
});

function forbiddenMatches(file: string, text: string) {
  return forbiddenCopyPatterns.flatMap((pattern) =>
    [...text.matchAll(new RegExp(pattern, "gi"))].map(
      (match) => `${file}: ${match[0]}`,
    ),
  );
}

function redactAllowedContexts(text: string) {
  return allowedContexts.reduce(
    (next, allowed) => next.replaceAll(allowed, ""),
    text,
  );
}

function session(sessionId: string, completedAt: string): LocalSession {
  return {
    sessionId,
    profileId: "copy_safety_profile",
    startedAt: completedAt,
    completedAt,
    cadence: "daily" as const,
    contextSnapshot: {},
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

function score(
  scoreId: string,
  sessionId: string,
  rawValue: number,
): ScoreRecord {
  return {
    scoreId,
    sessionId,
    taskRunId: `task_${sessionId}`,
    domain: "reaction_speed",
    metricName: "median_rt_ms",
    rawValue,
    normalizedValue: null,
    confidence: 0.95,
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}
