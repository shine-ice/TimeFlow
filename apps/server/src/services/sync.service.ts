import type { Knex } from "knex";
import { db } from "../db/knex";
import { runTransaction } from "../db/transaction";
import { SyncRepo } from "../models/repositories/sync.repo";
import { TaskRepo } from "../models/repositories/task.repo";
import type { SyncEntityType } from "../models/types/sync.type";
import type { Task, TaskPatch } from "../models/types/task.type";
import { WsHub } from "../ws/hub";

export type PushChange = {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  op: "create" | "update" | "delete";
  baseVersion: number;
  clientUpdatedAt?: string;
  patch?: unknown;
};

type SyncEntityState = {
  syncVersion: number;
  deletedAt?: string | null;
};

type EntityIdentity = {
  userId: string;
  entityId: string;
};

type ApplyChangeParams = EntityIdentity & {
  op: PushChange["op"];
  patch: unknown;
  version: number;
};

export type SyncEntityHandler = {
  findCurrent(
    trx: Knex.Transaction,
    identity: EntityIdentity,
  ): Promise<SyncEntityState | undefined>;
  sanitizePatch(patch: unknown): unknown;
  apply(trx: Knex.Transaction, change: ApplyChangeParams): Promise<unknown>;
};

export type SyncEntityHandlers = Partial<
  Record<SyncEntityType, SyncEntityHandler>
>;

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

const taskHandler: SyncEntityHandler = {
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

const defaultEntityHandlers: SyncEntityHandlers = {
  task: taskHandler,
};

export function createSyncService(
  additionalEntityHandlers: SyncEntityHandlers = {},
) {
  const entityHandlers: SyncEntityHandlers = {
    ...defaultEntityHandlers,
    ...additionalEntityHandlers,
  };

  return {
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

          const handler = entityHandlers[change.entityType];
          if (!handler) {
            results.push({
              mutationId: change.mutationId,
              entityType: change.entityType,
              entityId: change.entityId,
              op: change.op,
              status: "conflict",
              reason: "unsupported_entity_type",
              serverVersion: lastVersion,
              serverEntity: null,
            });
            continue;
          }

          const current = await handler.findCurrent(trx, {
            userId,
            entityId: change.entityId,
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
          const patch = handler.sanitizePatch(change.patch);
          const serverEntity = await handler.apply(trx, {
            userId,
            entityId: change.entityId,
            op: change.op,
            patch,
            version,
          });

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
}

export const SyncService = createSyncService();
