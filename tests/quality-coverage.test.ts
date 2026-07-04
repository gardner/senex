import { describe, expect, it } from "vitest";

import {
  generateArrowFocusTrials,
  generateSymbolMatchTrials,
  scoreArrowFocus,
  scoreSymbolMatch,
} from "@/lib/cognitive-tasks";
import { validateAnonymousReportingPayload } from "@/lib/anonymous-reporting";
import { assertLocalExportEnvelope } from "@/lib/local/export-schema";
import { LOCAL_APP_VERSION, LOCAL_SCHEMA_VERSION } from "@/lib/local/schema";
import {
  computeBaselineState,
  computeTrendSummary,
  evaluateTaskRunQuality,
  type TaskDefinition,
  type TrialResult,
} from "@/lib/test-engine";

const iso = "2026-07-04T00:00:00.000Z";

describe("E11 core scoring and quality coverage", () => {
  it("uses midpoint medians for even response counts across task scorers", () => {
    const symbolTrials = generateSymbolMatchTrials("qa-symbol", 4);
    const symbolScore = scoreSymbolMatch(
      symbolTrials,
      symbolTrials.map((trial, index) => ({
        trialId: trial.trialId,
        selectedSymbol: trial.correctSymbol,
        rtMs: [400, 800, 1000, 1200][index],
      })),
    );
    expect(symbolScore.metrics.median_rt_ms).toBe(900);

    const arrowTrials = generateArrowFocusTrials("qa-arrow", 4);
    const arrowScore = scoreArrowFocus(
      arrowTrials,
      arrowTrials.map((trial, index) => ({
        trialId: trial.trialId,
        direction: trial.targetDirection,
        rtMs: [400, 500, 700, 900][index],
      })),
    );
    expect(arrowScore.metrics.median_rt_ms).toBe(600);
  });

  it("counts each invalid trial once when deriving task-run quality", () => {
    const flags = evaluateTaskRunQuality({
      definition: qualityTask,
      trials: [
        trial({ rtMs: 420 }),
        trial({ responded: false, responseCount: 2, rtMs: null }),
      ],
    }).map((flag) => flag.code);

    expect(flags).not.toContain("too_few_valid_trials");
  });

  it("keeps baseline and trend calculations conservative at confidence edges", () => {
    expect(
      computeBaselineState([
        { value: 410, confidence: 0.59 },
        { value: 420, confidence: 0.4 },
      ]),
    ).toMatchObject({ state: "not_started", sampleCount: 0, mean: null });

    expect(
      computeBaselineState(
        Array.from({ length: 8 }, (_, index) => ({
          value: 400 + index,
          confidence: 0.6,
        })),
      ).state,
    ).toBe("stable");

    const trend = computeTrendSummary([
      { completedAt: "2026-07-01T00:00:00.000Z", value: 420, confidence: 0.9 },
      { completedAt: "2026-07-04T00:00:00.000Z", value: 410, confidence: 0.9 },
      { value: 200, confidence: 1 },
    ]);
    expect(trend.sevenDay).toMatchObject({
      state: "usable",
      sampleCount: 2,
      mean: 415,
    });
  });
});

describe("E11 import and consent boundary coverage", () => {
  it("rejects anonymous payloads with data categories missing from includedCategories", () => {
    expect(() =>
      validateAnonymousReportingPayload({
        payloadVersion: "anonymous-reporting-v1",
        anonymousStudyId: "study_qa",
        identityStatus: "active",
        generatedAt: iso,
        scope: { type: "all_existing_history" },
        includedCategories: [],
        consentSnapshot: {
          termsVersion: "anonymous-reporting-v1",
          decisions: {
            share_test_summaries: "missing",
            share_trial_level_data: "granted",
            share_session_context: "missing",
            share_demographics: "missing",
            share_questionnaires: "missing",
            allow_longitudinal_research_use: "missing",
            allow_approved_partner_access: "missing",
          },
          grantedCategories: ["share_trial_level_data"],
          latestRecordIds: {
            share_trial_level_data: "consent_trial_level",
          },
        },
        data: { trialEvents: [{ trialEventId: "trial_qa" }] },
        schemaVersions: { local: LOCAL_SCHEMA_VERSION, app: LOCAL_APP_VERSION },
        idempotencyKey: "qa_payload_missing_category",
      }),
    ).toThrow(/includedCategories/);
  });

  it("rejects backup envelopes with stale or tampered stimulus references", () => {
    const envelope = validEnvelope();
    envelope.data.stimulusReferences[0] = {
      ...envelope.data.stimulusReferences[0],
      stimulusPackId: "tampered_pack",
    };

    expect(() => assertLocalExportEnvelope(envelope)).toThrow(
      /stimulusReferences/,
    );
  });
});

const qualityTask: TaskDefinition = {
  taskId: "quality_task",
  taskVersion: "1.0.0",
  domain: "reaction_speed",
  cadence: "daily",
  estimatedDurationSeconds: 60,
  instructions: { summary: "Respond.", steps: ["Respond."] },
  practice: { trialCount: 0, requiredAccuracy: 0 },
  stimulus: {
    generation: "fixed",
    trialCount: 2,
    seedPolicy: "optional",
    alternateForms: false,
  },
  response: {
    types: ["keyboard"],
    validWindowMs: { min: 120, max: 1000 },
    allowedKeys: ["Space"],
  },
  scoring: {
    scoringVersion: "1.0.0",
    primaryMetric: "median_rt_ms",
    metrics: ["median_rt_ms"],
  },
  qualityRules: {
    anticipationMs: 120,
    lapseMs: 1000,
    minValidTrials: 1,
    maxLapseRate: 1,
  },
  accessibility: { inputAlternatives: ["keyboard"], notes: [] },
};

function trial(input: Partial<TrialResult>): TrialResult {
  return {
    trialIndex: 0,
    expectedResponse: "Space",
    actualResponse: "Space",
    correct: true,
    responded: true,
    responseCount: 1,
    rtMs: 400,
    ...input,
  };
}

function validEnvelope() {
  return {
    format: "senex.local-backup",
    exportSchemaVersion: 1,
    localSchemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
    exportId: "export_qa",
    exportedAt: iso,
    source: { app: "senex", origin: null, includeTrialEvents: true },
    metadata: { lastSavedAt: null },
    data: {
      profiles: [
        {
          profileId: "profile_qa",
          mode: "offline",
          createdAt: iso,
          updatedAt: iso,
          schemaVersion: LOCAL_SCHEMA_VERSION,
          appVersion: LOCAL_APP_VERSION,
        },
      ],
      sessions: [
        {
          sessionId: "session_qa",
          profileId: "profile_qa",
          startedAt: iso,
          completedAt: iso,
          cadence: "daily",
          contextSnapshot: {},
          qualityFlags: [],
          schemaVersion: LOCAL_SCHEMA_VERSION,
          appVersion: LOCAL_APP_VERSION,
        },
      ],
      taskRuns: [
        {
          taskRunId: "task_run_qa",
          sessionId: "session_qa",
          taskId: "simple_reaction_time",
          taskVersion: "1.0.0",
          stimulusPackId: "pack_qa",
          stimulusSeed: "seed_qa",
          startedAt: iso,
          completedAt: iso,
          summaryScore: { medianRtMs: 412 },
          qualityFlags: [],
          schemaVersion: LOCAL_SCHEMA_VERSION,
          appVersion: LOCAL_APP_VERSION,
        },
      ],
      trialEvents: [],
      scores: [],
      questionnaireAnswers: [],
      consentRecords: [],
      anonymousIdentities: [],
      reportingUploads: [],
      importAudits: [],
      stimulusReferences: [
        {
          taskRunId: "task_run_qa",
          taskId: "simple_reaction_time",
          taskVersion: "1.0.0",
          stimulusPackId: "pack_qa",
          stimulusSeed: "seed_qa",
        },
      ],
    },
  };
}
