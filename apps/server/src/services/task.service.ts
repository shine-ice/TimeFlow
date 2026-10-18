import { randomUUID } from "crypto";
import type { Knex } from "knex";
import { db } from "../db/knex";
import { runTransaction } from "../db/transaction";
import { ApiError, ApiCode } from "../utils/errors";
import { TaskRepo } from "../models/repositories/task.repo";
import { SyncRepo } from "../models/repositories/sync.repo";
import type {
  Task,
  TaskCreateInput,
  TaskPatch,
} from "../models/types/task.type";
import { WsHub } from "../ws/hub";

async function recordTaskChange(
  trx: Knex.Transaction,
  {
    userId,
    deviceId,
    entityId,
    op,
    version,
    payload,
  }: {
    userId: string;
    deviceId: string;
    entityId: string;
    op: "create" | "update" | "delete";
    version: number;
    payload: Task | null | undefined;
  },
) {
  await SyncRepo.recordChange(trx, {
    userId,
    deviceId,
    mutationId: randomUUID(),
    entityType: "task",
    entityId,
    op,
    version,
    payload,
  });
}

function broadcastTaskChange(userId: string, deviceId: string, version: number) {
  WsHub.broadcastToUser(userId, {
    type: "sync.changed",
    lastVersion: version,
    sourceDeviceId: deviceId,
  });
}

export const TaskService = {
  async getById(userId: string, taskId: string) {
    const task = await TaskRepo.findById(db, { userId, taskId });
    if (!task) throw new ApiError(ApiCode.TASK_NOT_FOUND);
    return { ...task };
  },

  async pageByUserId(userId: string, page: number = 1, pageSize: number = 10) {
    return TaskRepo.listByUserId(db, { userId, page, pageSize });
  },

  async insert(
    userId: string,
    task: TaskCreateInput,
    deviceId = "server-api",
  ) {
    const result = await runTransaction(async (trx) => {
      await SyncRepo.lockUserVersion(trx, { userId });
      const taskId = randomUUID();
      const version = await SyncRepo.nextVersion(trx, { userId });
      const entity = await TaskRepo.createWithId(trx, {
        userId,
        taskId,
        task,
        syncVersion: version,
      });
      await recordTaskChange(trx, {
        userId,
        deviceId,
        entityId: taskId,
        op: "create",
        version,
        payload: entity,
      });
      return { entity: entity!, version };
    });
    broadcastTaskChange(userId, deviceId, result.version);
    return result.entity;
  },

  async patch(
    userId: string,
    taskId: string,
    patch: TaskPatch,
    deviceId = "server-api",
  ) {
    const result = await runTransaction(async (trx) => {
      await SyncRepo.lockUserVersion(trx, { userId });
      const current = await TaskRepo.findById(trx, { userId, taskId });
      if (!current) throw new ApiError(ApiCode.TASK_NOT_FOUND);
      const version = await SyncRepo.nextVersion(trx, { userId });
      const entity = await TaskRepo.updateForSync(trx, {
        userId,
        taskId,
        patch,
        syncVersion: version,
      });
      await recordTaskChange(trx, {
        userId,
        deviceId,
        entityId: taskId,
        op: "update",
        version,
        payload: entity,
      });
      return { entity: entity!, version };
    });
    broadcastTaskChange(userId, deviceId, result.version);
    return result.entity;
  },

  async remove(userId: string, taskId: string, deviceId = "server-api") {
    const version = await runTransaction(async (trx) => {
      await SyncRepo.lockUserVersion(trx, { userId });
      const current = await TaskRepo.findById(trx, { userId, taskId });
      if (!current) throw new ApiError(ApiCode.TASK_NOT_FOUND);
      const version = await SyncRepo.nextVersion(trx, { userId });
      await TaskRepo.softDeleteForSync(trx, {
        userId,
        taskId,
        deletedAt: new Date().toISOString(),
        syncVersion: version,
      });
      await recordTaskChange(trx, {
        userId,
        deviceId,
        entityId: taskId,
        op: "delete",
        version,
        payload: null,
      });
      return version;
    });
    broadcastTaskChange(userId, deviceId, version);
    return true;
  },
};
