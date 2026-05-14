import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { addProduct, listProducts } from "@/lib/modules/product";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const db = await getDb();
    const products = await listProducts(db);
    return successResponse(products);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();
    const created = await addProduct(db, body);
    return successResponse(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
