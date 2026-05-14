import { z } from "zod";
import type { Client } from "@libsql/client";
import { NotFoundError, ValidationError } from "../errors.js";
import { toCampaign } from "../db/mappers.js";
import type { Campaign } from "../types.js";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Expected ISO date (YYYY-MM-DD...)");

const createCampaignSchema = z
  .object({
    name: z.string().min(1),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.number().positive(),
    startDate: isoDate,
    endDate: isoDate,
    active: z.boolean().optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "startDate must be on or before endDate",
    path: ["endDate"],
  })
  .refine(
    (v) => v.discountType !== "PERCENT" || v.discountValue <= 100,
    { message: "PERCENT discount must be <= 100", path: ["discountValue"] },
  );

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${label} input`, result.error.issues);
  }
  return result.data;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createCampaign(
  db: Client,
  input: CreateCampaignInput,
): Promise<Campaign> {
  const data = parse(createCampaignSchema, input, "createCampaign");
  const res = await db.execute({
    sql: `INSERT INTO campaigns (name, discount_type, discount_value, start_date, end_date, active)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      data.name,
      data.discountType,
      data.discountValue,
      data.startDate,
      data.endDate,
      data.active === false ? 0 : 1,
    ],
  });
  return toCampaign(res.rows[0]);
}

export async function listCampaigns(db: Client): Promise<Campaign[]> {
  const res = await db.execute(`SELECT * FROM campaigns ORDER BY id DESC`);
  return res.rows.map(toCampaign);
}

export interface AppliedCampaign {
  campaign: Campaign;
  discount: number;
  total: number;
}

export async function applyCampaign(
  db: Client,
  campaignId: number,
  subtotal: number,
  now: Date = new Date(),
): Promise<AppliedCampaign> {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new ValidationError("subtotal must be a non-negative number");
  }
  const res = await db.execute({
    sql: `SELECT * FROM campaigns WHERE id = ?`,
    args: [campaignId],
  });
  if (res.rows.length === 0) throw new NotFoundError("Campaign", campaignId);
  const campaign = toCampaign(res.rows[0]);

  if (campaign.active !== 1) {
    throw new ValidationError(`Campaign ${campaignId} is not active`);
  }
  const today = now.toISOString().slice(0, 10);
  if (today < campaign.start_date || today > campaign.end_date) {
    throw new ValidationError(
      `Campaign ${campaignId} is outside its active date range`,
    );
  }

  let discount = 0;
  if (campaign.discount_type === "PERCENT") {
    discount = round2((subtotal * campaign.discount_value) / 100);
  } else {
    discount = round2(Math.min(campaign.discount_value, subtotal));
  }
  const total = round2(Math.max(0, subtotal - discount));
  return { campaign, discount, total };
}
