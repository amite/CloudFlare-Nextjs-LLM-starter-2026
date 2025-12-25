import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("should render with title and three action buttons", async ({ page }) => {
    await page.goto("/");

    // Check for the main title
    await expect(page.getByRole("heading", { name: "CF Next LLM Boilerplate" })).toBeVisible();

    // Check for the three action buttons
    await expect(page.getByRole("link", { name: "Try LLM Chat Demo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View Counter Example" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Dashboard" })).toBeVisible();
  });
});
