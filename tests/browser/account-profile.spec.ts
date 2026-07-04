import { expect, test } from "@playwright/test";

test.describe("Account profile", () => {
  test("lets a signed-in user view and update basic profile fields", async ({
    page,
  }, testInfo) => {
    const email = `account-${Date.now()}-${testInfo.workerIndex}@example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Profile Smoke");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("a-perfectly-fine-password");
    const signUpButton = page.getByRole("button", {
      name: "Sign up",
      exact: true,
    });
    await expect(signUpButton).toBeEnabled();
    await signUpButton.click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "Account profile" }),
    ).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: email }),
    ).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue("Profile Smoke");

    await page.getByLabel("Display name").fill("Updated Profile Smoke");
    await page
      .getByLabel("Profile image URL")
      .fill("https://example.com/avatar.png");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByText("Account profile saved.")).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue(
      "Updated Profile Smoke",
    );
    await expect(
      page.getByRole("heading", { name: "Account data controls" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export account data" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Request account deletion" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Account updates do not change research consent."),
    ).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("account-profile.png"),
      fullPage: true,
    });
  });

  test("redirects signed-out account visitors", async ({ page }) => {
    await page.goto("/account");

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
