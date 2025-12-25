import { expect, test } from "@playwright/test";

test.describe("Chat Window", () => {
  test("should render correctly", async ({ page }) => {
    await page.goto("/examples/chat");

    // Check that chat page is loaded
    await expect(page.getByRole("heading", { name: "LLM Chat Demo" })).toBeVisible();

    // Check for provider selector
    await expect(page.getByRole("combobox")).toBeVisible();

    // Check for clear button
    await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();

    // Check for message container
    await expect(page.locator(".overflow-y-auto")).toBeVisible();

    // Check for input field
    await expect(page.getByPlaceholder("Type your message...")).toBeVisible();

    // Check for send button
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

    // Check for initial empty state message
    await expect(page.getByText("Start a conversation")).toBeVisible();
  });
});
