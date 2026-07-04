export const DATA_QUALITY_MINIMUM_COHORT_SIZE = 5;
export const DATA_QUALITY_SMALL_CELL_THRESHOLD = 3;
export const SMALL_CELL_SUPPRESSED_VALUE = "small_cell_suppressed";

export type DistributionRow = {
  value: string;
  count: number;
  share: number;
};

export type SuppressedDistributionRow = DistributionRow & {
  suppressed: boolean;
};

export type DataQualityPrivacyReview = {
  aggregateOnly: true;
  minimumCohortSize: number;
  smallCellThreshold: number;
  externalRelease: "blocked_small_cohort" | "review_required";
  smallCellSuppressed: boolean;
  suppressedDistributionCells: number;
};

export function suppressSmallDistributionCells(rows: DistributionRow[]) {
  const visibleRows: SuppressedDistributionRow[] = [];
  let suppressedCount = 0;
  let suppressedCells = 0;

  for (const row of rows) {
    if (row.count < DATA_QUALITY_SMALL_CELL_THRESHOLD) {
      suppressedCount += row.count;
      suppressedCells += 1;
    } else {
      visibleRows.push({ ...row, suppressed: false });
    }
  }

  if (suppressedCount > 0) {
    visibleRows.push({
      value: SMALL_CELL_SUPPRESSED_VALUE,
      count: suppressedCount,
      share: rate(suppressedCount, totalCount(rows)),
      suppressed: true,
    });
  }

  return {
    rows: visibleRows.sort(byDistributionCountThenValue),
    suppressedCells,
  };
}

export function buildDataQualityPrivacyReview(input: {
  acceptedSubmissions: number;
  suppressedDistributionCells: number;
}): DataQualityPrivacyReview {
  return {
    aggregateOnly: true,
    minimumCohortSize: DATA_QUALITY_MINIMUM_COHORT_SIZE,
    smallCellThreshold: DATA_QUALITY_SMALL_CELL_THRESHOLD,
    externalRelease:
      input.acceptedSubmissions < DATA_QUALITY_MINIMUM_COHORT_SIZE
        ? "blocked_small_cohort"
        : "review_required",
    smallCellSuppressed: input.suppressedDistributionCells > 0,
    suppressedDistributionCells: input.suppressedDistributionCells,
  };
}

function totalCount(rows: DistributionRow[]) {
  return rows.reduce((total, row) => total + row.count, 0);
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}

function byDistributionCountThenValue(
  left: SuppressedDistributionRow,
  right: SuppressedDistributionRow,
) {
  const byCount = right.count - left.count;
  if (byCount !== 0) return byCount;
  return left.value.localeCompare(right.value);
}
