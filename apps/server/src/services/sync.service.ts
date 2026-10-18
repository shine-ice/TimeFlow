import { runTransaction } from "../db/transaction";
import { SyncRepo } from "../models/repositories/sync.repo";
import { TaskRepo } from "../models/repositories/task.repo";
import type { TaskRow } from "../models/types/task.type";
import { WsHub } from "../ws/hub";

export type PushChange = {
  mutationId: string;
  entityType: "task";
  entityId: string;
  op: "create" | "update" | "delete";
  baseVersion: number;
  clientUpdatedAt?: string;
  patch?: Partial<TaskRow>;
};

const writableTaskFields = [
  "title",
  "description",
  "start_at",
  "end_at",
  "is_completed",
  "completed_at",
] as const;

function sanitizeTaskPatch(patch: Partial<TaskRow> | undefined) {
  const clean: Partial<TaskRow> = {};
  for (const field of writableTaskFields) {
    if (patch?.[field] !== undefined) clean[field] = patch[field] as never;
  }
  return clean;
}

export const SyncService = {
  async pull(userId: string, sinceVersion: number, pageSize: number) {
    return SyncRepo.pullSince(userId, sinceVersion, pageSize);
  },

  async push(userId: string, deviceId: string, changes: PushChange[]) {
    const transactionResult = await runTransaction(async (trx) => {
      const results: any[] = [];
      let lastVersion = await SyncRepo.lockUserVersion(userId, trx);
      let didWrite = false;

      for (const change of changes) {
        const previous = await SyncRepo.findMutation(
          userId,
          deviceId,
          change.mutationId,
          trx,
        );
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

        const current = await TaskRepo.findByIdIncludingDeletedForUpdate(
          userId,
          change.entityId,
          trx,
        );
        const currentVersion = Number(current?.sync_version ?? 0);
        const isConflict =
          change.op === "create"
            ? current != null
            : current == null ||
              current.deleted_at != null ||
              currentVersion > change.baseVersion;

        if (isConflict) {
          results.push({
            mutationId: change.mutationId,
            entityType: change.entityType,
            entityId: change.entityId,
            op: change.op,
            status: "conflict",
            serverVersion: current?.sync_version ?? lastVersion,
            serverEntity: current && !current.deleted_at ? current : null,
          });
          continue;
        }

        const version = await SyncRepo.nextVersion(userId, trx);
        const patch = sanitizeTaskPatch(change.patch);
        let serverEntity: TaskRow | null | undefined = null;

        if (change.op === "create") {
          serverEntity = await TaskRepo.createWithId(
            userId,
            change.entityId,
            patch,
            version,
            trx,
          );
        } else if (change.op === "update") {
          serverEntity = await TaskRepo.updateForSync(
            userId,
            change.entityId,
            patch,
            version,
            trx,
          );
        } else {
          await TaskRepo.softDeleteForSync(
            userId,
            change.entityId,
            new Date().toISOString(),
            version,
            trx,
          );
        }

        await SyncRepo.recordChange(
          {
            userId,
            deviceId,
            mutationId: change.mutationId,
            entityType: change.entityType,
            entityId: change.entityId,
            op: change.op,
            version,
            payload: change.op === "delete" ? null : serverEntity,
          },
          trx,
        );
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
