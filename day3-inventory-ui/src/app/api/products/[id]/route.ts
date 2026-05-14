import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { deleteProduct, updateProduct } from "@/lib/modules/product";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

function parseId(idStr: string): number {
  const n = Number.parseInt(idStr, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Invalid id: ${idStr}`);
  }
  return n;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const body = await req.json();
    const db = await getDb();
    const updated = await updateProduct(db, id, body);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const db = await getDb();
    await deleteProduct(db, id);
    return successResponse({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
