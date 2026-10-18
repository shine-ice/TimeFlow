import { db } from "../db/knex";
import { runTransaction } from "../db/transaction";
import { SyncRepo } from "../models/repositories/sync.repo";
import type { SyncEntityType } from "../models/types/sync.type";
import { WsHub } from "../ws/hub";
import type {
  SyncEntityHandler,
  SyncEntityHandlers,
} from "./sync-entity-handler";
import { TaskSyncHandler } from "./task-sync.handler";

export type { SyncEntityHandler, SyncEntityHandlers } from "./sync-entity-handler";

export type PushChange = {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  op: "create" | "update" | "delete";
  baseVersion: number;
  clientUpdatedAt?: string;
  patch?: unknown;
};

const defaultEntityHandlers: SyncEntityHandlers = {
  task: TaskSyncHandler,
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
