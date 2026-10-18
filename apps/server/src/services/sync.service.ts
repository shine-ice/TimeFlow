import { db } from "../db/knex";
import { runTransaction } from "../db/transaction";
import { SyncRepo } from "../models/repositories/sync.repo";
import { TaskRepo } from "../models/repositories/task.repo";
import type { Task, TaskPatch } from "../models/types/task.type";
import { WsHub } from "../ws/hub";

export type PushChange = {
  mutationId: string;
  entityType: "task";
  entityId: string;
  op: "create" | "update" | "delete";
  baseVersion: number;
  clientUpdatedAt?: string;
  patch?: TaskPatch;
};

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

export const SyncService = {
  async pull(userId: string, sinceVersion: number, pageSize: number) {
    return SyncRepo.pullSince(db, { userId, sinceVersion, pageSize });
  },

  async push(userId: string, deviceId: string, changes: PushChange[]) {
    const transactionResult = await runTransaction(async (trx) => {
      const results: any[] = [];
      let lastVersion = await SyncRepo.lockUserVersion(trx, { userId });
      let didWrite = false;

      for (const change of changes) {
        const previous = await SyncRepo.findMutation(trx, {
          userId,
          deviceId,
          mutationId: change.mutationId,
        });
        if (previous) {
          const matchesOriginalMutation =
            previous.entityType === change.entityType &&
            previous.entityId === change.entityId &&
            previous.op === change.op;
          if (!matchesOriginalMutation) {
            results.push({
              mutationId: change.mutationId,
              entityType: change.entityType,
              entityId: change.entityId,
              op: change.op,
              status: "conflict",
              reason: "mutation_id_reused",
              serverVersion: previous.version,
              serverEntity: previous.payload,
            });
            continue;
          }
          results.push({
            mutationId: change.mutationId,
            entityType: previous.entityType,
            entityId: previous.entityId,
            op: previous.op,
            status: "applied",
            version: previous.version,
            serverEntity: previous.payload,
          });
          continue;
        }

        const current = await TaskRepo.findByIdIncludingDeletedForUpdate(trx, {
          userId,
          taskId: change.entityId,
        });
        const currentVersion = Number(current?.syncVersion ?? 0);
        const isConflict =
          change.op === "create"
            ? current != null
            : current == null ||
              current.deletedAt != null ||
              currentVersion > change.baseVersion;

        if (isConflict) {
          results.push({
            mutationId: change.mutationId,
            entityType: change.entityType,
            entityId: change.entityId,
            op: change.op,
            status: "conflict",
            serverVersion: current?.syncVersion ?? lastVersion,
            serverEntity: current && !current.deletedAt ? current : null,
          });
          continue;
        }

        const version = await SyncRepo.nextVersion(trx, { userId });
        const patch = sanitizeTaskPatch(change.patch);
        let serverEntity: Task | null | undefined = null;

        if (change.op === "create") {
          serverEntity = await TaskRepo.createWithId(trx, {
            userId,
            taskId: change.entityId,
            task: patch as TaskPatch & { title: string },
            syncVersion: version,
          });
        } else if (change.op === "update") {
          serverEntity = await TaskRepo.updateForSync(trx, {
            userId,
            taskId: change.entityId,
            patch,
            syncVersion: version,
          });
        } else {
          await TaskRepo.softDeleteForSync(trx, {
            userId,
            taskId: change.entityId,
            deletedAt: new Date().toISOString(),
            syncVersion: version,
          });
        }

        await SyncRepo.recordChange(trx, {
          userId,
          deviceId,
          mutationId: change.mutationId,
          entityType: change.entityType,
          entityId: change.entityId,
          op: change.op,
          version,
          payload: change.op === "delete" ? null : serverEntity,
        });
        didWrite = true;

        results.push({
          mutationId: change.mutationId,
          entityType: change.entityType,
          entityId: change.entityId,
          op: change.op,
          status: "applied",
          version,
          serverEntity,
        });
        lastVersion = version;
      }

      return { results, lastVersion, didWrite };
    });

    if (transactionResult.didWrite) {
      WsHub.broadcastToUser(userId, {
        type: "sync.changed",
        lastVersion: transactionResult.lastVersion,
        sourceDeviceId: deviceId,
      });
    }

    const { didWrite: _didWrite, ...output } = transactionResult;
    return output;
  },
};
