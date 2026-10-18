import { Request, Response } from "express";
import { TaskService } from "../services/task.service";
import { TaskRepo } from "../models/repositories/task.repo";
import { ApiError, ApiCode, ok } from "../utils/errors";
import { createSchema, patchSchema } from "../models/schemas/task.schema";

export const TaskController = {
  async page(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const tasks = await TaskService.pageByUserId(userId, page, pageSize);
    return res.json(ok(tasks));
  },

  async getById(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = req.params.id as string;
    const task = await TaskService.getById(userId, id);
    return res.json(ok(task));
  },

  async insert(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const task = createSchema.parse(req.body);
    const inserted = await TaskService.insert(userId, task, req.auth!.deviceId);
    return res.json(ok(inserted));
  },

  async patch(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = req.params.id as string;
    const patch = patchSchema.parse(req.body);
    const updated = await TaskService.patch(userId, id, patch, req.auth!.deviceId);
    return res.json(ok(updated));
  },

  async remove(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = req.params.id as string;
    const deleted = await TaskService.remove(userId, id, req.auth!.deviceId);
    return res.json(ok(deleted));
  },
};
