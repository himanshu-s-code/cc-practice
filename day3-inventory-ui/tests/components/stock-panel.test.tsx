import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const stockInAction = vi.fn();
const stockOutAction = vi.fn();
const createWarehouseAction = vi.fn();

vi.mock("@/lib/actions/stock-actions", () => ({
  stockInAction: (...args: unknown[]) => stockInAction(...args),
  stockOutAction: (...args: unknown[]) => stockOutAction(...args),
  createWarehouseAction: (...args: unknown[]) => createWarehouseAction(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { StockPanel } from "@/components/stock/stock-panel";
import { toast } from "sonner";

const PRODUCTS = [
  {
    id: 1,
    sku: "MBP-2024",
    name: "MacBook Pro",
    description: null,
    price: 298000,
    cost: 200000,
    created_at: "",
    updated_at: "",
  },
];
const WAREHOUSES = [
  { id: 1, name: "Tokyo", location: null, created_at: "" },
  { id: 2, name: "Osaka", location: null, created_at: "" },
];
const MOVEMENTS = [
  {
    id: 1,
    product_id: 1,
    warehouse_id: 1,
    type: "IN" as const,
    quantity: 10,
    reference_id: null,
    note: null,
    created_at: "2026-05-14 10:00:00",
    product_sku: "MBP-2024",
    product_name: "MacBook Pro",
    warehouse_name: "Tokyo",
  },
];

describe("StockPanel (在庫操作)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期表示は入庫タブで、入庫フォームが見える", () => {
    // Arrange / Act
    render(
      <StockPanel
        products={PRODUCTS}
        warehouses={WAREHOUSES}
        movements={MOVEMENTS}
      />,
    );

    // Assert
    expect(
      screen.getByText("Register stock-in"),
    ).toBeInTheDocument();
  });

  it("出庫タブをクリックすると出庫フォームに切り替わる", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <StockPanel
        products={PRODUCTS}
        warehouses={WAREHOUSES}
        movements={MOVEMENTS}
      />,
    );

    // Act
    await user.click(screen.getByRole("tab", { name: "Stock out" }));

    // Assert
    expect(
      screen.getByText("Register stock-out"),
    ).toBeInTheDocument();
  });

  it("履歴タブで過去の在庫移動が表示される", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <StockPanel
        products={PRODUCTS}
        warehouses={WAREHOUSES}
        movements={MOVEMENTS}
      />,
    );

    // Act
    await user.click(screen.getByRole("tab", { name: "History" }));

    // Assert
    expect(screen.getByText("Movement history")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("入庫フォームで商品/倉庫/数量を入れて送信すると stockInAction が正しく呼ばれる", async () => {
    // Arrange
    const user = userEvent.setup();
    stockInAction.mockResolvedValue({ data: { id: 99 }, error: null });
    render(
      <StockPanel
        products={PRODUCTS}
        warehouses={WAREHOUSES}
        movements={MOVEMENTS}
      />,
    );

    // Act
    // shadcn Select is a combobox; the form has two: product + warehouse.
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole("option", { name: /MBP-2024/ }));
    await user.click(comboboxes[1]);
    await user.click(await screen.findByRole("option", { name: "Tokyo" }));

    // Quantity is a number input; pick the first one in the in-form
    const numberInputs = screen
      .getAllByRole("spinbutton")
      .filter((el) => (el as HTMLInputElement).type === "number");
    await user.type(numberInputs[0], "5");

    await user.click(screen.getByRole("button", { name: "Stock in" }));

    // Assert
    await waitFor(() => {
      expect(stockInAction).toHaveBeenCalledTimes(1);
    });
    expect(stockInAction.mock.calls[0][0]).toMatchObject({
      productId: 1,
      warehouseId: 1,
      quantity: 5,
    });
    expect(toast.success).toHaveBeenCalledWith("Stocked in");
  });

  it("出庫アクションがエラーを返したらエラートーストが出る", async () => {
    // Arrange
    const user = userEvent.setup();
    stockOutAction.mockResolvedValue({
      data: null,
      error: { name: "InsufficientStockError", message: "Insufficient stock" },
    });
    render(
      <StockPanel
        products={PRODUCTS}
        warehouses={WAREHOUSES}
        movements={MOVEMENTS}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Stock out" }));

    // Act
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole("option", { name: /MBP-2024/ }));
    await user.click(comboboxes[1]);
    await user.click(await screen.findByRole("option", { name: "Tokyo" }));
    const numberInputs = screen.getAllByRole("spinbutton");
    await user.type(numberInputs[0], "1");
    await user.click(screen.getByRole("button", { name: "Stock out" }));

    // Assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Insufficient stock");
    });
  });
});
