import { expect, test } from "@playwright/test";

test.describe("Counter Component", () => {
  test.skip("should render and work correctly", async ({ page }) => {
    await page.goto("/examples/counter");

    // Check that counter page is loaded
    await expect(page.getByRole("heading", { name: "Counter Example" })).toBeVisible();

    // Wait for counter to load (it fetches data on mount)
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Get initial counter value
    const counterValue = page.locator(".tabular-nums");
    await expect(counterValue).toBeVisible();

    // Wait for the counter value to load (not "-" or "loading...")
    await counterValue.evaluate((el: HTMLElement) => {
      return el.textContent !== "-" && el.textContent !== null;
    });

    // Get initial value
    const initialValue = await counterValue.textContent();
    expect(initialValue).not.toBe("-");

    // Click increment button
    await page.getByRole("button", { name: "+" }).click();

    // Wait for update
    await page.waitForTimeout(500);

    // Check that value increased
    const incrementedValue = await counterValue.textContent();
    expect(Number.parseInt(incrementedValue || "0")).toBe(Number.parseInt(initialValue || "0") + 1);

    // Click decrement button
    await page.getByRole("button", { name: "−" }).click();

    // Wait for update
    await page.waitForTimeout(500);

    // Check that value decreased
    const decrementedValue = await counterValue.textContent();
    expect(Number.parseInt(decrementedValue || "0")).toBe(Number.parseInt(initialValue || "0"));
  });
});
