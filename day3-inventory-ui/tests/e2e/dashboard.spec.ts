import { test, expect } from "@playwright/test";

test.describe("ダッシュボード", () => {
  test("ダッシュボードがサマリーカードと共に表示される", async ({ page }) => {
    // Arrange / Act
    await page.goto("/dashboard");

    // Assert
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Total products")).toBeVisible();
    await expect(page.getByText("Total stock (units)")).toBeVisible();
    await expect(page.getByText("Inventory value (cost)")).toBeVisible();
  });

  test("ナビゲーションから各ページに遷移できる", async ({ page }) => {
    // Arrange
    await page.goto("/dashboard");

    // Act
    await page.getByRole("link", { name: "Products" }).click();

    // Assert
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  });
});
