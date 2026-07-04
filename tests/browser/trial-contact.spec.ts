import { expect, test, type Page } from "@playwright/test";

test.describe("Trial contact", () => {
  test("lets a signed-in user opt in and opt out separately from research sharing", async ({
    page,
  }, testInfo) => {
    const email = `trial-contact-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "Trial contact" }),
    ).toBeVisible();
    await expect(
      page.getByText("Trial contact is not study enrolment."),
    ).toBeVisible();
    await expect(
      page.getByText("Anonymous Reporting users cannot be contacted"),
    ).toBeVisible();
    await expect(page.getByText("Trial contact is off.")).toBeVisible();

    const saveButton = page.getByRole("button", {
      name: "Save trial contact preference",
    });
    await expect(saveButton).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: "I'm open to being contacted about relevant research studies or clinical trials.",
      })
      .check();
    await page
      .getByLabel("Preferred contact method")
      .selectOption("account_email");
    await page.getByLabel("Country or region").fill("New Zealand");
    await page.getByLabel("Age eligibility").selectOption("40_to_64");
    await page
      .getByRole("checkbox", { name: "Memory or attention concern" })
      .check();
    await page
      .getByLabel("Availability preference")
      .selectOption("remote_only");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(
      page.getByText("Trial contact preference saved."),
    ).toBeVisible();
    await expect(page.getByText("Trial contact profile saved.")).toBeVisible();
    await expect(page.getByText("Trial contact is on.")).toBeVisible();
    await expect(page.getByText("Consent version")).toBeVisible();
    await expect(page.getByText("trial-contact-v1")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Country or region")).toHaveValue(
      "New Zealand",
    );
    await expect(
      page.getByRole("checkbox", { name: "Memory or attention concern" }),
    ).toBeChecked();

    await page
      .getByRole("checkbox", {
        name: "I'm open to being contacted about relevant research studies or clinical trials.",
      })
      .uncheck();
    await saveButton.click();
    await expect(
      page.getByText("Trial contact preference saved."),
    ).toBeVisible();
    await expect(page.getByText("Trial contact is off.")).toBeVisible();
    await expect(page.getByText("Opted out")).toBeVisible();
    await page
      .getByRole("button", { name: "Clear trial contact profile" })
      .click();
    await expect(
      page.getByText("Trial contact profile cleared."),
    ).toBeVisible();
    await expect(page.getByLabel("Country or region")).toHaveValue("");
    await expect(
      page.getByRole("checkbox", { name: "Memory or attention concern" }),
    ).not.toBeChecked();

    await page.screenshot({
      path: testInfo.outputPath("trial-contact.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Trial Contact Smoke");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-perfectly-fine-password");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
