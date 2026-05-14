import { test, expect } from "@playwright/test";

test.describe("入庫・出庫フロー", () => {
  test("在庫ページに入庫タブと出庫タブがある", async ({ page }) => {
    // Arrange / Act
    await page.goto("/stock");

    // Assert
    await expect(page.getByRole("heading", { name: "Stock" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Stock in" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Stock out" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History" })).toBeVisible();
  });

  test("入庫タブをクリックすると入庫フォームが表示される", async ({ page }) => {
    // Arrange
    await page.goto("/stock");

    // Act
    await page.getByRole("tab", { name: "Stock in" }).click();

    // Assert
    await expect(
      page.getByRole("heading", { name: "Register stock-in" }),
    ).toBeVisible();
    await expect(page.getByText("Product").first()).toBeVisible();
    await expect(page.getByText("Warehouse").first()).toBeVisible();
    await expect(page.getByText("Quantity")).toBeVisible();
  });
});
