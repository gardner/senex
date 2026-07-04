import {
  computeBaselineState,
  computeTrendSummary,
  type BaselineState,
  type TrendWindow,
} from "@/lib/test-engine";

import type { LocalSession, ScoreRecord } from "./local";

export interface OfflineDashboardSummary {
  todayStatus: "not_started" | "complete";
  baseline: {
    state: BaselineState;
    sampleCount: number;
    mean: number | null;
  };
  completion: {
    sevenDay: CompletionWindow;
    thirtyDay: CompletionWindow;
  };
  domainCards: DomainCardSummary[];
}

export interface CompletionWindow {
  completedDays: number;
}

export interface DomainCardSummary {
  domain: string;
  label: string;
  description: string;
  status: string;
  trend: string;
  confidenceLabel: string;
  lastTestedAt: string | null;
  detail: string;
}

type ScoreSample = {
  value: number;
  confidence: number;
  completedAt?: string;
};

const DOMAIN_FALLBACKS: Array<Omit<DomainCardSummary, "lastTestedAt">> = [
  {
    domain: "reaction_speed",
    label: "Reaction speed",
    description: "Speed and consistency on response-time tasks.",
    status: "Not started",
    trend: "No personal baseline yet",
    confidenceLabel: "Insufficient data",
    detail: "Complete repeated local sessions to form a personal baseline.",
  },
  {
    domain: "processing",
    label: "Attention and processing",
    description: "Focus, filtering, and speeded visual matching.",
    status: "Not started",
    trend: "Waiting for task data",
    confidenceLabel: "Insufficient data",
    detail: "Symbol Match and Arrow Focus will fill this card.",
  },
  {
    domain: "working_memory",
    label: "Working memory",
    description: "Short sequence recall and replay accuracy.",
    status: "Not started",
    trend: "Waiting for task data",
    confidenceLabel: "Insufficient data",
    detail: "Sequence Tap will fill this card.",
  },
  {
    domain: "learning",
    label: "Learning and recall",
    description: "Pair learning, delayed recall, and retention.",
    status: "Not started",
    trend: "Waiting for task data",
    confidenceLabel: "Insufficient data",
    detail: "Pair Learning and Seven-Day Learning will fill this card.",
  },
];

export function buildOfflineDashboardSummary(input: {
  now: string;
  sessions: LocalSession[];
  scores: ScoreRecord[];
}): OfflineDashboardSummary {
  const nowMs = Date.parse(input.now);
  const completedSessions = input.sessions.filter(
    (session) =>
      session.completedAt &&
      Number.isFinite(Date.parse(session.completedAt)) &&
      Date.parse(session.completedAt) <= nowMs,
  );
  const reactionSamples = samplesForDomain({
    domain: "reaction_speed",
    metricName: "median_rt_ms",
    sessions: completedSessions,
    scores: input.scores,
  });
  const baseline = computeBaselineState(reactionSamples);
  const trends = computeTrendSummary(reactionSamples);

  return {
    todayStatus: hasCompletedOnDate(completedSessions, input.now)
      ? "complete"
      : "not_started",
    baseline,
    completion: {
      sevenDay: completionWindow(input.now, completedSessions, 7),
      thirtyDay: completionWindow(input.now, completedSessions, 30),
    },
    domainCards: [
      reactionSpeedCard(baseline, trends.sevenDay, reactionSamples),
      groupedDomainCard(input.sessions, input.scores, DOMAIN_FALLBACKS[1], [
        ["processing_speed", "correct_count", "Symbol Match correct count"],
        ["attention_control", "accuracy", "Arrow Focus accuracy"],
        ["attention_control", "conflict_cost_ms", "Arrow Focus conflict cost"],
      ]),
      groupedDomainCard(input.sessions, input.scores, DOMAIN_FALLBACKS[2], [
        ["working_memory", "span", "Sequence Tap span"],
      ]),
      groupedDomainCard(input.sessions, input.scores, DOMAIN_FALLBACKS[3], [
        ["learning_memory", "retention", "Seven-Day Learning retention"],
        [
          "learning_memory",
          "immediate_accuracy",
          "Pair Learning immediate accuracy",
        ],
      ]),
    ],
  };
}

function samplesForDomain(input: {
  domain: string;
  metricName: string;
  sessions: LocalSession[];
  scores: ScoreRecord[];
}): ScoreSample[] {
  const completedAtBySession = new Map(
    input.sessions
      .filter((session) => session.completedAt)
      .map((session) => [session.sessionId, session.completedAt!]),
  );
  return input.scores
    .filter(
      (score) =>
        score.domain === input.domain && score.metricName === input.metricName,
    )
    .map((score) => ({
      value: score.rawValue,
      confidence: score.confidence,
      completedAt: completedAtBySession.get(score.sessionId),
    }))
    .filter((sample) => sample.completedAt)
    .toSorted((a, b) => a.completedAt!.localeCompare(b.completedAt!));
}

function reactionSpeedCard(
  baseline: OfflineDashboardSummary["baseline"],
  sevenDay: TrendWindow,
  samples: ScoreSample[],
): DomainCardSummary {
  const lastTestedAt = samples.at(-1)?.completedAt ?? null;
  const fallback = DOMAIN_FALLBACKS[0];
  if (baseline.state === "not_started") {
    return { ...fallback, lastTestedAt };
  }
  return {
    ...fallback,
    status: `Personal baseline ${stateLabel(baseline.state)}`,
    trend:
      sevenDay.mean === null
        ? "Recent trend needs more sessions"
        : `Recent mean ${Math.round(sevenDay.mean)} ms`,
    confidenceLabel: confidenceLabel(sevenDay),
    lastTestedAt,
    detail:
      "Compared only with your own local history. Early sessions are baseline-forming.",
  };
}

function groupedDomainCard(
  sessions: LocalSession[],
  scores: ScoreRecord[],
  fallback: Omit<DomainCardSummary, "lastTestedAt">,
  priorities: Array<[domain: string, metricName: string, label: string]>,
): DomainCardSummary {
  const match = firstPrioritizedScore(sessions, scores, priorities);
  if (!match) return { ...fallback, lastTestedAt: null };
  return {
    ...fallback,
    status: "Task data recorded",
    trend: `${match.label}: ${formatScoreValue(match.score.rawValue)}`,
    confidenceLabel: confidenceFromValue(match.score.confidence),
    lastTestedAt: match.completedAt,
    detail: "Compared only with your own local task history.",
  };
}

function firstPrioritizedScore(
  sessions: LocalSession[],
  scores: ScoreRecord[],
  priorities: Array<[domain: string, metricName: string, label: string]>,
) {
  const completedAtBySession = new Map(
    sessions
      .filter((session) => session.completedAt)
      .map((session) => [session.sessionId, session.completedAt!]),
  );
  for (const [domain, metricName, label] of priorities) {
    const score = scores
      .filter(
        (item) =>
          item.domain === domain &&
          item.metricName === metricName &&
          completedAtBySession.has(item.sessionId),
      )
      .toSorted((a, b) =>
        completedAtBySession
          .get(a.sessionId)!
          .localeCompare(completedAtBySession.get(b.sessionId)!),
      )
      .at(-1);
    if (score)
      return {
        score,
        completedAt: completedAtBySession.get(score.sessionId)!,
        label,
      };
  }
  return null;
}

function hasCompletedOnDate(sessions: LocalSession[], now: string) {
  const today = dateKey(now);
  return sessions.some((session) => dateKey(session.completedAt) === today);
}

function completionWindow(
  now: string,
  sessions: LocalSession[],
  days: number,
): CompletionWindow {
  const cutoff = Date.parse(now) - days * 24 * 60 * 60 * 1000;
  const completedDays = new Set(
    sessions
      .filter((session) => {
        const completedAt = Date.parse(session.completedAt ?? "");
        return Number.isFinite(completedAt) && completedAt >= cutoff;
      })
      .map((session) => dateKey(session.completedAt)),
  );
  return { completedDays: completedDays.size };
}

function stateLabel(state: BaselineState) {
  return state.replaceAll("_", " ");
}

function confidenceLabel(window: TrendWindow) {
  if (window.state === "usable") return "Usable";
  if (window.state === "low_confidence") return "Low confidence";
  return "Insufficient data";
}

function confidenceFromValue(value: number) {
  if (value >= 0.8) return "Usable";
  if (value > 0) return "Low confidence";
  return "Insufficient data";
}

function formatScoreValue(value: number) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

function dateKey(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}
