import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should deny access to unauthenticated user", async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto("/dashboard");

    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Check that we're on the sign-in page
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
