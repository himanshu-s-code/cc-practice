import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createProductAction = vi.fn();
const updateProductAction = vi.fn();

vi.mock("@/lib/actions/product-actions", () => ({
  createProductAction: (...args: unknown[]) => createProductAction(...args),
  updateProductAction: (...args: unknown[]) => updateProductAction(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { toast } from "sonner";

describe("ProductFormDialog (商品追加フォーム)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("商品名が空の場合にバリデーションエラーが表示され、サブミットされない", async () => {
    // Arrange
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ProductFormDialog
        mode="create"
        open={true}
        onOpenChange={onOpenChange}
      />,
    );
    // Fill SKU but not name, leave price/cost at 0
    await user.type(screen.getByLabelText("SKU"), "TEST-1");

    // Act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(createProductAction).not.toHaveBeenCalled();
  });

  it("正常な入力で createProductAction が正しいペイロードで呼ばれる", async () => {
    // Arrange
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    createProductAction.mockResolvedValue({
      data: {
        id: 1,
        sku: "TEST-1",
        name: "Test Widget",
        description: null,
        price: 1000,
        cost: 700,
        created_at: "",
        updated_at: "",
      },
      error: null,
    });
    render(
      <ProductFormDialog
        mode="create"
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    await user.type(screen.getByLabelText("SKU"), "TEST-1");
    await user.type(screen.getByLabelText("Name"), "Test Widget");
    const priceInput = screen.getByLabelText("Price");
    await user.clear(priceInput);
    await user.type(priceInput, "1000");
    const costInput = screen.getByLabelText("Cost");
    await user.clear(costInput);
    await user.type(costInput, "700");

    // Act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    await waitFor(() => {
      expect(createProductAction).toHaveBeenCalledTimes(1);
    });
    const payload = createProductAction.mock.calls[0][0];
    expect(payload).toMatchObject({
      sku: "TEST-1",
      name: "Test Widget",
      price: 1000,
      cost: 700,
    });
    expect(toast.success).toHaveBeenCalledWith("Product created");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("サーバーアクションがエラーを返したらトーストでエラー表示する", async () => {
    // Arrange
    const user = userEvent.setup();
    createProductAction.mockResolvedValue({
      data: null,
      error: { name: "DuplicateError", message: "Product with sku='X' already exists" },
    });
    render(
      <ProductFormDialog mode="create" open={true} onOpenChange={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("SKU"), "X");
    await user.type(screen.getByLabelText("Name"), "Dup");

    // Act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Product with sku='X' already exists",
      );
    });
  });
});
