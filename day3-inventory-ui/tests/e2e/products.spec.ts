import { test, expect } from "@playwright/test";

const uniqueSku = () => `E2E-${Date.now()}`;

test.describe("商品管理", () => {
  test("商品を追加できる", async ({ page }) => {
    // Arrange
    const sku = uniqueSku();
    await page.goto("/products");

    // Act
    await page.getByRole("button", { name: "Add Product" }).click();
    await page.getByLabel("SKU").fill(sku);
    await page.getByLabel("Name").fill("E2E Widget");
    await page.getByLabel("Price").fill("1000");
    await page.getByLabel("Cost").fill("700");
    await page.getByRole("button", { name: "Save" }).click();

    // Assert
    await expect(page.getByText(sku)).toBeVisible();
  });
});
