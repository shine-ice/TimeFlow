import type { Request, Response, NextFunction } from "express";
import { ApiError, err } from "../utils/errors";

export function errorMiddleware(
  e: any,
  _req: Request,
  _res: Response,
  _next: NextFunction,
) {
  if (e instanceof ApiError) {
    return _res.status(e.status).json(err(e.code, e.message, e.details));
  }

  if (e?.name === "ZodError") {
    return _res
      .status(400)
      .json(err("VALIDATION_ERROR", "Invalid request", e.issues));
  }

  console.error("[UnhandledError]", e);
  return _res.status(500).json(err("NOT_FOUND", "Internal server error"));
}
