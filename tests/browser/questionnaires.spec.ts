import { expect, test } from "@playwright/test";

test.describe("Research questionnaires", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
    await page.reload();
  });

  test("saves demographics with every question type and updates reporting completion", async ({
    page,
  }, testInfo) => {
    await page
      .getByRole("button", { name: "Use privately on this device" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Research questionnaires" }),
    ).toBeVisible();
    const demographics = page
      .getByRole("heading", { name: "Demographics" })
      .locator("xpath=ancestor::section");
    await page.getByRole("button", { name: "Save demographics" }).click();
    await expect(
      demographics.getByText("Birth year is required."),
    ).toBeVisible();
    await demographics.getByLabel("Birth year", { exact: true }).fill("1980");
    await demographics
      .getByLabel("Country or region", { exact: true })
      .fill("Aotearoa New Zealand");
    await demographics
      .getByLabel("Primary language", { exact: true })
      .fill("English");
    await demographics
      .getByLabel("Other languages used regularly", { exact: true })
      .fill("te reo");
    await demographics
      .getByLabel("Education range", { exact: true })
      .selectOption("bachelors");
    await demographics.getByRole("checkbox", { name: "Maori" }).check();
    await demographics.getByRole("checkbox", { name: "European" }).check();
    await demographics
      .getByLabel("Sex assigned at birth", { exact: true })
      .selectOption("prefer_not_to_say");
    await demographics
      .getByLabel("Gender", { exact: true })
      .selectOption("prefer_not_to_say");
    await demographics
      .getByLabel("Handedness", { exact: true })
      .selectOption("right");
    await demographics
      .getByRole("group", { name: "Vision or hearing limitations" })
      .getByRole("checkbox", { name: "None" })
      .check();
    await demographics
      .getByLabel("Years using digital devices", { exact: true })
      .fill("20");
    await demographics
      .getByLabel("Device familiarity", { exact: true })
      .fill("4");

    await page.getByRole("button", { name: "Save demographics" }).click();
    await expect(page.getByText("Demographics saved locally.")).toBeVisible();
    await expect(
      page.getByText("Demographics: complete").first(),
    ).toBeVisible();

    const saved = await page.evaluate<
      Array<{
        questionId: string;
        questionnaireVersion: string;
        answerStatus: string;
      }>
    >(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const answers = await local.listQuestionnaireAnswers({
        questionnaireId: "demographics_v1",
      });
      return answers.map(
        (answer: {
          questionId: string;
          questionnaireVersion: string;
          answerStatus: string;
        }) => ({
          questionId: answer.questionId,
          questionnaireVersion: answer.questionnaireVersion,
          answerStatus: answer.answerStatus,
        }),
      );
    });
    expect(saved).toHaveLength(12);
    expect(
      saved.find((answer) => answer.questionId === "gender"),
    ).toMatchObject({
      answerStatus: "prefer_not_to_say",
    });

    await page.screenshot({
      path: testInfo.outputPath("questionnaires-demographics.png"),
      fullPage: true,
    });
  });

  test("attaches session context to the latest session and keeps quality flags explicit", async ({
    page,
  }, testInfo) => {
    await page
      .getByRole("button", { name: "Use privately on this device" })
      .click();
    await page
      .getByRole("button", { name: "Run demo reaction sprint" })
      .click();
    await expect(
      page.getByText("Reaction Time Sprint saved locally."),
    ).toBeVisible();

    const sessionContext = page
      .getByRole("heading", { name: "Session context" })
      .locator("xpath=ancestor::section");
    await sessionContext
      .getByLabel("Sleep quality last night", { exact: true })
      .selectOption("very_poor");
    await sessionContext
      .getByLabel("Stress during this session", { exact: true })
      .fill("5");
    await sessionContext
      .getByLabel("Illness today", { exact: true })
      .selectOption("yes");
    await sessionContext
      .getByRole("checkbox", { name: "Sedating medicine" })
      .check();
    await sessionContext
      .getByLabel("Distractions during test", { exact: true })
      .fill("4");
    await sessionContext
      .getByLabel("Session context notes", { exact: true })
      .fill("Interrupted twice.");
    await page.getByRole("button", { name: "Save session context" }).click();
    await expect(
      page.getByText("Session context saved locally."),
    ).toBeVisible();

    const saved = await page.evaluate<{
      latestSession: {
        qualityFlags: string[];
        contextSnapshot: Record<string, unknown>;
      };
      answers: Array<{ sessionId: string | null }>;
    }>(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const sessions = await local.listLocalSessions();
      const answers = await local.listQuestionnaireAnswers({
        questionnaireId: "session_context_v1",
      });
      return {
        latestSession: sessions.at(-1),
        answers: answers.map((answer: { sessionId: string | null }) => ({
          sessionId: answer.sessionId,
        })),
      };
    });
    expect(saved.answers).toHaveLength(6);
    expect(saved.answers.every((answer) => answer.sessionId)).toBe(true);
    expect(saved.latestSession.qualityFlags).toEqual(
      expect.arrayContaining([
        "self_reported_poor_sleep",
        "self_reported_high_stress",
        "self_reported_illness",
        "self_reported_sedating_substance",
        "self_reported_distraction",
      ]),
    );
    expect(saved.latestSession.contextSnapshot.session_context_v1).toBeTruthy();

    await page.screenshot({
      path: testInfo.outputPath("questionnaires-session-context.png"),
      fullPage: true,
    });
  });
});
