import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiCode, ApiError } from "../utils/errors";

export function authRequired(
  _req: Request,
  _res: Response,
  _next: NextFunction,
) {
  const header = _req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    throw new ApiError(ApiCode.AUTH_UNAUTHORIZED, "No token provided");
  }

  try {
    const secret = process.env.JWT_SECRET || "default-secret";
    const payload = jwt.verify(token, secret) as {
      sub?: string;
      deviceId?: string;
    };
    const userId = Number(payload.sub);

    if (!userId) {
      throw new ApiError(ApiCode.AUTH_UNAUTHORIZED, "Invalid token");
    }
    _req.auth = { userId, deviceId: payload.deviceId };
    _next();
  } catch (e) {
    throw new ApiError(ApiCode.AUTH_UNAUTHORIZED, "Invalid token");
  }
}
