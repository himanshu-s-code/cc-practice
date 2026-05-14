import { describe, it, expect } from "vitest";
import { successResponse, errorResponse } from "@/lib/api-response";
import { InsufficientStockError, ValidationError } from "@/lib/errors";

describe("api-response モジュール", () => {
  it("successResponse は { data, error: null } を返す", async () => {
    // Arrange
    const payload = { ok: true };

    // Act
    const res = successResponse(payload);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(body).toEqual({ data: payload, error: null });
  });

  it("InsufficientStockError は HTTP 400 で返される", async () => {
    // Arrange
    const err = new InsufficientStockError(1, 1, 10, 3);

    // Act
    const res = errorResponse(err);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.name).toBe("InsufficientStockError");
  });

  it("ValidationError は details に Zod issues を載せて 400 を返す", async () => {
    // Arrange
    const err = new ValidationError("invalid", []);

    // Act
    const res = errorResponse(err);
    const body = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(body.error.name).toBe("ValidationError");
    expect(body.error.details).toEqual([]);
  });
});
