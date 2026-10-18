import { TaskRepo } from "../models/repositories/task.repo";
import type { Task, TaskPatch } from "../models/types/task.type";
import type { SyncEntityHandler } from "./sync-entity-handler";

const writableTaskFields = [
  "title",
  "description",
  "startAt",
  "endAt",
  "isCompleted",
  "completedAt",
] as const;

function sanitizeTaskPatch(patch: TaskPatch | undefined) {
  const clean: TaskPatch = {};
  for (const field of writableTaskFields) {
    if (patch?.[field] !== undefined) clean[field] = patch[field] as never;
  }
  return clean;
}

export const TaskSyncHandler: SyncEntityHandler = {
  findCurrent(trx, { userId, entityId }) {
    return TaskRepo.findByIdIncludingDeletedForUpdate(trx, {
      userId,
      taskId: entityId,
    });
  },

  sanitizePatch(patch) {
    return sanitizeTaskPatch(patch as TaskPatch | undefined);
  },

  async apply(trx, { userId, entityId, op, patch, version }) {
    const taskPatch = patch as TaskPatch;
    let serverEntity: Task | null | undefined = null;

    if (op === "create") {
      serverEntity = await TaskRepo.createWithId(trx, {
        userId,
        taskId: entityId,
        task: taskPatch as TaskPatch & { title: string },
        syncVersion: version,
      });
    } else if (op === "update") {
      serverEntity = await TaskRepo.updateForSync(trx, {
        userId,
        taskId: entityId,
        patch: taskPatch,
        syncVersion: version,
      });
    } else {
      await TaskRepo.softDeleteForSync(trx, {
        userId,
        taskId: entityId,
        deletedAt: new Date().toISOString(),
        syncVersion: version,
      });
    }

    return serverEntity;
  },
};
