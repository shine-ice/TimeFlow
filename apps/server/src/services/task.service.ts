import { randomUUID } from "crypto";
import type { Knex } from "knex";
import { runTransaction } from "../db/transaction";
import { ApiError, ApiCode } from "../utils/errors";
import { TaskRepo } from "../models/repositories/task.repo";
import { SyncRepo } from "../models/repositories/sync.repo";
import { TaskRow } from "../models/types/task.type";
import { WsHub } from "../ws/hub";

async function recordTaskChange(
  trx: Knex.Transaction,
  userId: string,
  deviceId: string,
  entityId: string,
  op: "create" | "update" | "delete",
  version: number,
  payload: TaskRow | null | undefined,
) {
  await SyncRepo.recordChange(
    {
      userId,
      deviceId,
      mutationId: randomUUID(),
      entityType: "task",
      entityId,
      op,
      version,
      payload,
    },
    trx,
  );
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
    const task = await TaskRepo.findById(userId, taskId);
    if (!task) throw new ApiError(ApiCode.TASK_NOT_FOUND);
    return { ...task };
  },

  async pageByUserId(userId: string, page: number = 1, pageSize: number = 10) {
    return TaskRepo.listByUserId(userId, page, pageSize);
  },

  async insert(
    userId: string,
    task: Partial<TaskRow>,
    deviceId = "server-api",
  ) {
    const result = await runTransaction(async (trx) => {
      await SyncRepo.lockUserVersion(userId, trx);
      const taskId = randomUUID();
      const version = await SyncRepo.nextVersion(userId, trx);
      const entity = await TaskRepo.createWithId(
        userId,
        taskId,
        task,
        version,
        trx,
      );
      await recordTaskChange(
        trx,
        userId,
        deviceId,
        taskId,
        "create",
        version,
        entity,
      );
      return { entity: entity!, version };
    });
    broadcastTaskChange(userId, deviceId, result.version);
    return result.entity;
  },

  async patch(
    userId: string,
    taskId: string,
    patch: Partial<TaskRow>,
    deviceId = "server-api",
  ) {
    const result = await runTransaction(async (trx) => {
      await SyncRepo.lockUserVersion(userId, trx);
      const current = await TaskRepo.findById(userId, taskId, trx);
      if (!current) throw new ApiError(ApiCode.TASK_NOT_FOUND);
      const version = await SyncRepo.nextVersion(userId, trx);
      const entity = await TaskRepo.updateForSync(
        userId,
        taskId,
        patch,
        version,
        trx,
      );
      await recordTaskChange(
        trx,
        userId,
        deviceId,
        taskId,
        "update",
        version,
        entity,
      );
      return { entity: entity!, version };
    });
    broadcastTaskChange(userId, deviceId, result.version);
    return result.entity;
  },

  async remove(userId: string, taskId: string, deviceId = "server-api") {
    const version = await runTransaction(async (trx) => {
      await SyncRepo.lockUserVersion(userId, trx);
      const current = await TaskRepo.findById(userId, taskId, trx);
      if (!current) throw new ApiError(ApiCode.TASK_NOT_FOUND);
      const version = await SyncRepo.nextVersion(userId, trx);
      await TaskRepo.softDeleteForSync(
        userId,
        taskId,
        new Date().toISOString(),
        version,
        trx,
      );
      await recordTaskChange(
        trx,
        userId,
        deviceId,
        taskId,
        "delete",
        version,
        null,
      );
      return version;
    });
    broadcastTaskChange(userId, deviceId, version);
    return true;
  },
};
