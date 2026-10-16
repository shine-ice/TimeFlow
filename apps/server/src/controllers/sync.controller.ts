import { Request, Response } from "express";
import { SyncService } from "../services/sync.service";
import z from "zod";

export const SyncController = {
  async pull(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const schema = z.object({
      sinceVersion: z.number().int(),
      pageSize: z.number().int().max(500).default(200),
    });
    const input = schema.parse(req.body);

    const out = await SyncService.pull(
      userId,
      input.sinceVersion,
      input.pageSize,
    );
    return res.json({ ...out, serverTime: new Date().toISOString() });
  },

  async push(req: Request, res: Response) {},
};
