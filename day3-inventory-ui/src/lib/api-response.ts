import { NextResponse } from "next/server";
import {
  DuplicateError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "./errors";

export interface ApiError {
  name: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiError | null;
}

export function successResponse<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json<ApiEnvelope<T>>({ data, error: null }, init);
}

export function errorResponse(err: unknown): NextResponse {
  const status = errorStatus(err);
  const body: ApiEnvelope<null> = {
    data: null,
    error: toApiError(err),
  };
  return NextResponse.json(body, { status });
}

function errorStatus(err: unknown): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof InsufficientStockError) return 400;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof DuplicateError) return 409;
  return 500;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ValidationError) {
    return { name: err.name, message: err.message, details: err.issues };
  }
  if (
    err instanceof InsufficientStockError ||
    err instanceof NotFoundError ||
    err instanceof DuplicateError
  ) {
    return { name: err.name, message: err.message };
  }
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { name: "UnknownError", message: String(err) };
}
