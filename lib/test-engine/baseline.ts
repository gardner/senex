export type BaselineState =
  | "not_started"
  | "forming"
  | "usable"
  | "stable"
  | "needs_recalibration";

export interface BaselineSample {
  value: number;
  confidence: number;
  completedAt?: string;
}

export function computeBaselineState(samples: BaselineSample[]): {
  state: BaselineState;
  sampleCount: number;
  mean: number | null;
} {
  const usable = samples.filter((sample) => sample.confidence >= 0.6);
  if (usable.length === 0)
    return { state: "not_started", sampleCount: 0, mean: null };
  if (usable.length < 3)
    return { state: "forming", sampleCount: usable.length, mean: mean(usable) };
  if (usable.length >= 8)
    return { state: "stable", sampleCount: usable.length, mean: mean(usable) };
  return { state: "usable", sampleCount: usable.length, mean: mean(usable) };
}

export function computeTrendSummary(samples: BaselineSample[]): {
  sevenDay: TrendWindow;
  thirtyDay: TrendWindow;
} {
  const latest = latestTime(samples);
  return {
    sevenDay: trendWindow(samples, latest, 7),
    thirtyDay: trendWindow(samples, latest, 30),
  };
}

export interface TrendWindow {
  state: "insufficient_data" | "usable" | "low_confidence";
  sampleCount: number;
  mean: number | null;
}

function trendWindow(
  samples: BaselineSample[],
  latest: number,
  days: number,
): TrendWindow {
  const cutoff = latest - days * 24 * 60 * 60 * 1000;
  const windowSamples = samples.filter((sample) => {
    if (!sample.completedAt) return false;
    return Date.parse(sample.completedAt) >= cutoff;
  });
  if (windowSamples.length < 2) {
    return {
      state: "insufficient_data",
      sampleCount: windowSamples.length,
      mean: null,
    };
  }
  const confidence = averageConfidence(windowSamples);
  return {
    state: confidence < 0.8 ? "low_confidence" : "usable",
    sampleCount: windowSamples.length,
    mean: mean(windowSamples),
  };
}

function latestTime(samples: BaselineSample[]) {
  const times = samples
    .map((sample) => (sample.completedAt ? Date.parse(sample.completedAt) : 0))
    .filter((time) => Number.isFinite(time));
  return Math.max(...times, 0);
}

function averageConfidence(samples: BaselineSample[]) {
  return (
    samples.reduce((sum, sample) => sum + sample.confidence, 0) / samples.length
  );
}

function mean(samples: BaselineSample[]) {
  return (
    samples.reduce((sum, sample) => sum + sample.value, 0) / samples.length
  );
}
