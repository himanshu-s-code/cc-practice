import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { createWarehouse, listWarehouses } from "@/lib/modules/stock";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const db = await getDb();
    return successResponse(await listWarehouses(db));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();
    const w = await createWarehouse(db, body);
    return successResponse(w, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
