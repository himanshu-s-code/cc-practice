import type { ZodIssue } from "zod";

export class InsufficientStockError extends Error {
  readonly name = "InsufficientStockError";
  constructor(
    public readonly productId: number,
    public readonly warehouseId: number,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `Insufficient stock for product ${productId} in warehouse ${warehouseId}: requested ${requested}, available ${available}`,
    );
  }
}

export class NotFoundError extends Error {
  readonly name = "NotFoundError";
  constructor(entity: string, key: string | number) {
    super(`${entity} not found: ${key}`);
  }
}

export class ValidationError extends Error {
  readonly name = "ValidationError";
  constructor(
    message: string,
    public readonly issues: ZodIssue[] = [],
  ) {
    super(message);
  }
}
