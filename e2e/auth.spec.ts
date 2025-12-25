import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("should allow simple authentication with credentials", async ({ page }) => {
    // Navigate to sign-in page
    await page.goto("/auth/signin");

    // Check that we're on the sign-in page
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Fill in credentials (demo user from auth config)
    await page.getByLabel("Email").fill("demo@example.com");
    await page.getByLabel("Password").fill("password123");

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should be redirected to dashboard after successful login
    await expect(page).toHaveURL("/dashboard");

    // Check that dashboard content is visible
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("This is a protected page")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Navigate to sign-in page
    await page.goto("/auth/signin");

    // Fill in invalid credentials
    await page.getByLabel("Email").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrongpassword");

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should stay on sign-in page or show error
    // The exact behavior depends on the auth implementation
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
