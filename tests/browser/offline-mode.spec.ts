import { expect, test } from "@playwright/test";

test.describe("Offline Mode onboarding and dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
    await page.reload();
  });

  test("starts private mode, saves baseline context, updates dashboard, and deletes local history", async ({
    page,
  }, testInfo) => {
    const apiPosts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/")) {
        apiPosts.push(request.url());
      }
    });

    await expect(
      page.getByRole("heading", { name: "Choose how to use Senex" }),
    ).toBeVisible();
    await expect(page.getByText("No local history yet.")).toBeVisible();

    await page
      .getByRole("button", { name: "Use privately on this device" })
      .click();
    await expect(
      page.getByText("Private mode is ready on this browser."),
    ).toBeVisible();

    await page.getByLabel("Sleep last night").selectOption("7-8_hours");
    await page.getByLabel("Stress today").selectOption("prefer_not_to_answer");
    await page.getByLabel("Distractions today").selectOption("low");
    await page
      .getByLabel("Anything that might affect today's result?")
      .fill("Quiet room, morning session.");
    await page.getByRole("button", { name: "Save baseline setup" }).click();
    await expect(page.getByText("Baseline setup saved locally.")).toBeVisible();

    const contextRecords = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const summary = await local.readLocalStorageSummary();
      const answers = await local.listQuestionnaireAnswers({
        questionnaireId: "baseline_setup_v1",
      });
      return { summary, answers };
    });
    expect(contextRecords.summary.hasLocalHistory).toBe(true);
    expect(contextRecords.answers).toHaveLength(4);
    expect(apiPosts).toEqual([]);

    await expect(
      page.getByRole("heading", { name: "Offline dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Today: not started")).toBeVisible();
    await expect(page.getByText("Baseline: not started")).toBeVisible();
    await expect(page.getByText("Last 7 days: 0 completed days")).toBeVisible();

    await page
      .getByRole("button", { name: "Run demo reaction sprint" })
      .click();
    await expect(
      page.getByText("Reaction Time Sprint saved locally."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh offline dashboard" })
      .click();
    await expect(page.getByText("Today: complete")).toBeVisible();
    await expect(page.getByText("Baseline: forming")).toBeVisible();
    await expect(page.getByText("Reaction speed")).toBeVisible();
    await expect(page.getByText("Personal baseline forming")).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("offline-mode-dashboard.png"),
      fullPage: true,
    });

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Delete local history");
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Delete local history" }).click();
    await expect(page.getByText("Delete cancelled.")).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "Delete local history" }).click();
    await expect(page.getByText("Local history deleted.")).toBeVisible();
    await expect(page.getByText("No local history yet.")).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("offline-mode-deleted.png"),
      fullPage: true,
    });
  });
});
