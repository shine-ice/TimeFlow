import { Request, Response } from "express";
import { SyncService } from "../services/sync.service";
import { pullSchema, pushSchema } from "../models/schemas/sync.schema";
import { ApiCode, ApiError, ok } from "../utils/errors";

export const SyncController = {
  async pull(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const input = pullSchema.parse(req.body);

    const out = await SyncService.pull(
      userId,
      input.sinceVersion,
      input.pageSize,
    );
    return res.json(ok({ ...out, serverTime: new Date().toISOString() }));
  },

  async push(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const deviceId = req.auth!.deviceId;
    if (!deviceId) {
      throw new ApiError(ApiCode.AUTH_UNAUTHORIZED, "Device id is required");
    }
    const input = pushSchema.parse(req.body);
    const out = await SyncService.push(userId, deviceId, input.changes);
    return res.json(ok({ ...out, serverTime: new Date().toISOString() }));
  },
};
