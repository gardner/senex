import { expect, test } from "@playwright/test";

test.describe("public shell", () => {
  test("renders the home page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Welcome to Senex" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create an account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to the dashboard" }),
    ).toBeVisible();
  });

  test("renders auth entry pages", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.goto("/sign-up");
    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: "Forgot your password?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();

    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: "This reset link isn't valid" }),
    ).toBeVisible();
  });

  test("redirects signed-out dashboard visitors", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
