import { db } from "../db/knex";
import { ApiError, ApiCode } from "../utils/errors";
import { TaskRepo } from "../models/repositories/task.repo";
import { TaskRow } from "../models/types/task.type";

export const TaskService = {
  async getById(userId: string, taskId: string) {
    const task = await TaskRepo.findById(userId, taskId);
    if (!task) {
      throw new ApiError(ApiCode.TASK_NOT_FOUND);
    }
    return {
      ...task,
    };
  },

  async pageByUserId(userId: string, page: number = 1, pageSize: number = 10) {
    return await TaskRepo.listByUserId(userId, page, pageSize);
  },

  async insert(userId: string, task: Partial<TaskRow>) {
    return await TaskRepo.create(userId, task);
  },

  async patch(userId: string, taskId: string, patch: Partial<TaskRow>) {
    const updated = await TaskRepo.update(userId, taskId, patch);
    if (!updated) {
      throw new ApiError(ApiCode.TASK_NOT_FOUND);
    }
    return TaskRepo.findById(userId, taskId);
  },

  async remove(userId: string, taskId: string) {
    const deleted = await TaskRepo.softDelete(
      userId,
      taskId,
      new Date().toISOString(),
    );
    if (!deleted) {
      throw new ApiError(ApiCode.TASK_NOT_FOUND);
    }
    return true;
  },
};
