import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PUBLIC_ROUTES = [
  { path: "/", heading: "Start with a quick cognitive check" },
  { path: "/sign-in", heading: "Sign in" },
  { path: "/sign-up", heading: "Create an account" },
  { path: "/forgot-password", heading: "Forgot your password?" },
];

test.describe("accessibility baseline", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`has no automated WCAG violations on ${route.path}`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", { name: route.heading }),
      ).toBeVisible();
      await waitForAccessibilityReady(page, route.path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("keeps a visible keyboard focus indicator on primary commands", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Senex" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sign up" })).toBeFocused();

    const focusStyle = await page
      .getByRole("link", { name: "Sign up" })
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          boxShadow: style.boxShadow,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });
    expect(hasVisibleFocusIndicator(focusStyle)).toBe(true);

    await page.screenshot({
      path: testInfo.outputPath("accessibility-focus-order.png"),
      fullPage: true,
    });
  });

  test("supports reduced motion for interactive controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const transitionDuration = await page
      .getByRole("link", { name: "Start a quick check" })
      .evaluate((element) => getComputedStyle(element).transitionDuration);

    expect(
      Math.max(...computedTimeListMs(transitionDuration)),
    ).toBeLessThanOrEqual(0.001);
  });

  test("completes supported task runners without pointer input", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await clearLocalData(page);
    await page.reload();

    await completeSymbolMatchWithKeyboard(page);
    await completeArrowFocusWithKeyboard(page);

    const persisted = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const sessions = await local.listAllLocalSessionsForTests();
      const taskRuns = (
        await Promise.all(
          sessions.map((session: { sessionId: string }) =>
            local.listTaskRunsForSession(session.sessionId),
          ),
        )
      ).flat();
      return taskRuns.map((run: { taskId: string }) => run.taskId).sort();
    });

    expect(persisted).toEqual(
      expect.arrayContaining(["arrow_focus", "symbol_match"]),
    );

    await page.screenshot({
      path: testInfo.outputPath("accessibility-keyboard-task-runners.png"),
      fullPage: true,
    });
  });
});

async function clearLocalData(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    await local.deleteSenexLocalDatabase();
  });
}

async function waitForAccessibilityReady(page: Page, path: string) {
  if (path !== "/") return;
  await expect(page.getByText("No local history yet.")).toBeVisible();
  await expect(page.getByText("Reporting is off.")).toBeVisible();
}

async function completeSymbolMatchWithKeyboard(page: Page) {
  const startButton = page.getByRole("button", { name: "Start Symbol Match" });
  await expect(startButton).toBeEnabled();
  await startButton.press("Enter");
  const runner = page.getByRole("region", { name: "Symbol Match runner" });
  for (let trialIndex = 1; trialIndex <= 6; trialIndex += 1) {
    await expect(
      runner.getByText(`Symbol Match trial ${trialIndex} of 6`),
    ).toBeVisible();
    await page.keyboard.press("1");
  }
  await expect(page.getByText("Symbol Match saved locally.")).toBeVisible();
}

async function completeArrowFocusWithKeyboard(page: Page) {
  const startButton = page.getByRole("button", { name: "Start Arrow Focus" });
  await expect(startButton).toBeEnabled();
  await startButton.press("Enter");
  const runner = page.getByRole("region", { name: "Arrow Focus runner" });
  for (let trialIndex = 1; trialIndex <= 8; trialIndex += 1) {
    await expect(
      runner.getByText(`Arrow Focus trial ${trialIndex} of 8`),
    ).toBeVisible();
    const direction = await runner
      .getByTestId("arrow-focus-target-direction")
      .getAttribute("data-direction");
    await page.keyboard.press(
      direction === "left" ? "ArrowLeft" : "ArrowRight",
    );
  }
  await expect(page.getByText("Arrow Focus saved locally.")).toBeVisible();
}

function hasVisibleFocusIndicator(input: {
  boxShadow: string;
  outlineStyle: string;
  outlineWidth: string;
}) {
  return (
    input.boxShadow !== "none" ||
    (input.outlineStyle !== "none" && input.outlineWidth !== "0px")
  );
}

function computedTimeListMs(value: string) {
  return value.split(",").map((part) => {
    const trimmed = part.trim();
    if (trimmed.endsWith("ms")) return Number(trimmed.slice(0, -2));
    if (trimmed.endsWith("s")) return Number(trimmed.slice(0, -1)) * 1000;
    return Number(trimmed);
  });
}
