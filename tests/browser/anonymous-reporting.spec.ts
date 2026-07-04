import { expect, test } from "@playwright/test";

test.describe("Anonymous reporting dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
    await page.reload();
  });

  test("creates an anonymous study ID, saves granular consent, and queues an explicit upload", async ({
    page,
  }, testInfo) => {
    const apiPosts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/")) {
        apiPosts.push(request.url());
      }
    });

    await page
      .getByRole("button", { name: "Use privately on this device" })
      .click();
    await page
      .getByRole("button", { name: "Run demo reaction sprint" })
      .click();
    await expect(
      page.getByText("Reaction Time Sprint saved locally."),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Anonymous reporting" }),
    ).toBeVisible();
    await expect(page.getByText("Reporting is off.")).toBeVisible();

    await page
      .getByRole("button", { name: "Create anonymous study ID" })
      .click();
    await expect(page.getByText(/^Study ID: study_/)).toBeVisible();

    await page.getByLabel("Share test summaries").check();
    await page.getByLabel("Allow longitudinal research use").check();
    await page.getByRole("button", { name: "Save reporting consent" }).click();
    await expect(page.getByText("Consent saved locally.")).toBeVisible();

    await page.getByRole("button", { name: "Build reporting payload" }).click();
    await expect(
      page.getByText(
        "Payload includes: test summaries, longitudinal research use",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Payload includes: trial-level data"),
    ).not.toBeVisible();

    await page.getByRole("button", { name: "Queue reporting upload" }).click();
    await expect(page.getByText("Upload queued locally.")).toBeVisible();
    expect(apiPosts).toEqual([]);

    await page.getByRole("button", { name: "Submit queued upload" }).click();
    await expect(page.getByText("Upload submitted.")).toBeVisible();

    const localState = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      return {
        identities: await local.listAnonymousIdentities(),
        uploads: await local.listReportingUploads(),
        consents: await local.listConsentRecords({
          mode: "anonymous_reporting",
        }),
      };
    });
    expect(localState.identities).toHaveLength(1);
    expect(localState.identities[0].status).toBe("active");
    expect(localState.uploads).toHaveLength(1);
    expect(localState.uploads[0].status).toBe("succeeded");
    expect(localState.consents).toHaveLength(7);
    expect(apiPosts).toHaveLength(1);

    await page.screenshot({
      path: testInfo.outputPath("anonymous-reporting-dashboard.png"),
      fullPage: true,
    });
  });
});
