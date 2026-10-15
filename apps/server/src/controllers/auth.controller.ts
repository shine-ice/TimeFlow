import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserRepo } from "../models/repositories/user.repo";
import { ApiCode, ApiError, ok } from "../utils/errors";
import {
  LoginSchema,
  RegisterSchema,
  RefreshSchema,
} from "../models/schemas/auth.schema";

export const AuthController = {
  async register(req: Request, res: Response) {
    const input = RegisterSchema.parse(req.body);
    const exist = await UserRepo.findByEmail(input.email);
    if (exist) {
      throw new ApiError(ApiCode.USER_EMAIL_EXISTS);
    }

    const now = new Date().toISOString();
    const hash = await AuthService.hashPassword(input.password);
    const inserted = await UserRepo.insert({
      email: input.email,
      name: input.name,
      password_hash: hash,
      timezone: "UTC",
      created_at: now,
      updated_at: now,
    });

    return res.status(201).json(
      ok({
        user: { id: inserted.id, email: inserted.email, name: inserted.name },
      }),
    );
  },

  async login(req: Request, res: Response) {
    const input = LoginSchema.parse(req.body);
    const user = await UserRepo.findByEmail(input.email);
    if (!user) {
      throw new ApiError(ApiCode.AUTH_INVALID_CREDENTIALS);
    }

    const isPasswordValid = await AuthService.verifyPassword(
      input.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new ApiError(ApiCode.AUTH_INVALID_CREDENTIALS);
    }

    const deviceId = input.deviceId || `web-${Date.now()}`;
    const tokens = await AuthService.issueToken(user.id, deviceId);
    return res.json(
      ok({
        tokens,
        user: { id: user.id, email: user.email, name: user.name },
      }),
    );
  },

  async refresh(req: Request, res: Response) {
    const input = RefreshSchema.parse(req.body);

    try {
      const rotated = await AuthService.rotateRefreshToken(input.refreshToken);
      return res.json(
        ok({
          tokens: rotated,
        }),
      );
    } catch {
      throw new ApiError(ApiCode.AUTH_INVALID_REFRESH_TOKEN);
    }
  },

  async logout(req: Request, res: Response) {
    if (req.auth?.deviceId) {
      await AuthService.revokeDeviceTokens(
        String(req.auth.userId),
        req.auth.deviceId,
      );
    }
    return res.json(ok({ ok: true }));
  },
};
