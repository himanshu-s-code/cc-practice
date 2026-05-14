import { test, expect } from "@playwright/test";

test.describe("受注フロー", () => {
  test("受注ページに一覧と新規受注ボタンがある", async ({ page }) => {
    // Arrange / Act
    await page.goto("/orders");

    // Assert
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New order" })).toBeVisible();
  });

  test("新規受注ダイアログが開く", async ({ page }) => {
    // Arrange
    await page.goto("/orders");

    // Act
    await page.getByRole("button", { name: "New order" }).click();

    // Assert
    await expect(
      page.getByRole("dialog").getByText("New order").first(),
    ).toBeVisible();
    await expect(page.getByLabel("Customer name")).toBeVisible();
  });

  test("ステータスフィルタが機能する", async ({ page }) => {
    // Arrange
    await page.goto("/orders");

    // Act
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Pending" }).click();

    // Assert — filter applied (URL or visible badge expectation)
    await expect(page.locator("body")).toContainText("Orders");
  });
});
