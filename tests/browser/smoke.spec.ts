import { expect, test } from "@playwright/test";

test.describe("public shell", () => {
  test("renders the home page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Start with a quick cognitive check",
      }),
    ).toBeVisible();
    await expect(page.getByText("No account needed.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start a quick check" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create an account" }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Save it after it proves useful."),
    ).toBeVisible();
    await expect(
      page.getByText("Cloudflare-native starter app"),
    ).not.toBeVisible();
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
