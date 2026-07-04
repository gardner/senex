import { expect, test } from "@playwright/test";

test.describe("test engine browser utilities", () => {
  test("uses browser monotonic timing and visibility metadata", async ({
    page,
  }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const enginePath = "/lib/test-engine/index.ts";
      const engine = await import(/* @vite-ignore */ enginePath);
      const stimulusTime = performance.now();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const responseTime = performance.now();
      const rtMs = engine.measureReactionTime(stimulusTime, responseTime);
      const visibilityFlag = engine.buildVisibilityFlag({
        hidden: document.hidden,
        at: responseTime,
      });
      return {
        monotonic: responseTime >= stimulusTime,
        rtMs,
        visibilityLevel: visibilityFlag.level,
      };
    });

    expect(result.monotonic).toBe(true);
    expect(result.rtMs).toBeGreaterThanOrEqual(0);
    expect(result.visibilityLevel).toBe("task_run");
  });
});
