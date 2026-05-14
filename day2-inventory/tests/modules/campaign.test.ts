import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db.js";
import {
  applyCampaign,
  createCampaign,
} from "../../src/modules/campaign.js";
import { NotFoundError, ValidationError } from "../../src/errors.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function offset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("campaign module", () => {
  it("creates a percent campaign and applies the discount", async () => {
    const db = await createTestDb();
    const c = await createCampaign(db, {
      name: "Spring 10%",
      discountType: "PERCENT",
      discountValue: 10,
      startDate: offset(-1),
      endDate: offset(7),
    });
    const result = await applyCampaign(db, c.id, 200);
    expect(result.discount).toBe(20);
    expect(result.total).toBe(180);
  });

  it("creates a fixed campaign and applies the discount", async () => {
    const db = await createTestDb();
    const c = await createCampaign(db, {
      name: "Flat $5",
      discountType: "FIXED",
      discountValue: 5,
      startDate: offset(-1),
      endDate: offset(7),
    });
    const result = await applyCampaign(db, c.id, 100);
    expect(result.discount).toBe(5);
    expect(result.total).toBe(95);
  });

  it("clamps fixed discount to subtotal", async () => {
    const db = await createTestDb();
    const c = await createCampaign(db, {
      name: "Big",
      discountType: "FIXED",
      discountValue: 500,
      startDate: offset(-1),
      endDate: offset(7),
    });
    const result = await applyCampaign(db, c.id, 100);
    expect(result.discount).toBe(100);
    expect(result.total).toBe(0);
  });

  it("rejects expired campaigns", async () => {
    const db = await createTestDb();
    const c = await createCampaign(db, {
      name: "Past",
      discountType: "PERCENT",
      discountValue: 10,
      startDate: offset(-10),
      endDate: offset(-5),
    });
    await expect(applyCampaign(db, c.id, 100)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects unknown campaign", async () => {
    const db = await createTestDb();
    await expect(applyCampaign(db, 999, 100)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects invalid PERCENT > 100", async () => {
    const db = await createTestDb();
    await expect(
      createCampaign(db, {
        name: "Bad",
        discountType: "PERCENT",
        discountValue: 150,
        startDate: today(),
        endDate: offset(1),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
