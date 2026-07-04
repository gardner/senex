import { describe, expect, it } from "vitest";

import { buildDataQualityDashboard } from "@/lib/admin/data-quality-metrics";
import { acceptedDataQualityPayload } from "./admin-data-quality-fixtures";

describe("admin data quality privacy guardrails", () => {
  it("suppresses low-count session context distribution cells", () => {
    const dashboard = buildDataQualityDashboard(
      [acceptedDataQualityPayload("study_privacy_one")],
      [],
      "2026-07-04T00:00:00.000Z",
    );

    expect(dashboard.privacy).toMatchObject({
      aggregateOnly: true,
      externalRelease: "blocked_small_cohort",
      smallCellSuppressed: true,
      suppressedDistributionCells: 4,
    });
    expect(dashboard.deviceDistribution).toEqual([
      {
        value: "small_cell_suppressed",
        count: 2,
        share: 1,
        suppressed: true,
      },
    ]);
  });

  it("keeps distribution labels after the small-cell threshold is met", () => {
    const dashboard = buildDataQualityDashboard(
      [
        acceptedDataQualityPayload("study_privacy_one"),
        acceptedDataQualityPayload("study_privacy_two"),
        acceptedDataQualityPayload("study_privacy_three"),
        acceptedDataQualityPayload("study_privacy_four"),
        acceptedDataQualityPayload("study_privacy_five"),
      ],
      [],
      "2026-07-04T00:00:00.000Z",
    );

    expect(dashboard.privacy).toMatchObject({
      externalRelease: "review_required",
      smallCellSuppressed: false,
      suppressedDistributionCells: 0,
    });
    expect(dashboard.deviceDistribution).toContainEqual({
      value: "desktop",
      count: 5,
      share: 0.5,
      suppressed: false,
    });
  });
});
