import { randomUUID } from "crypto";
import type { Knex } from "knex";
import { db } from "../../db/knex";
import { SyncChangeCreateInput } from "../types/sync.type";

type DbExecutor = Knex | Knex.Transaction;

export const SyncRepo = {
  async ensureUserVersionRow(userId: string, executor: DbExecutor = db) {
    await executor("sync_user_versions")
      .insert({
        user_id: userId,
        last_version: 0,
        updated_at: new Date().toISOString(),
      })
      .onConflict("user_id")
      .ignore();
  },

  async getLastVersion(userId: string, executor: DbExecutor = db) {
    const row = await executor("sync_user_versions")
      .where("user_id", userId)
      .first();
    return Number(row?.last_version ?? 0);
  },

  async lockUserVersion(userId: string, executor: Knex.Transaction) {
    await this.ensureUserVersionRow(userId, executor);
    const row = await executor("sync_user_versions")
      .where("user_id", userId)
      .forUpdate()
      .first();
    return Number(row?.last_version ?? 0);
  },

  async nextVersion(userId: string, executor: DbExecutor = db) {
    await this.ensureUserVersionRow(userId, executor);
    await executor("sync_user_versions")
      .where("user_id", userId)
      .increment("last_version", 1)
      .update({ updated_at: new Date().toISOString() });
    return this.getLastVersion(userId, executor);
  },

  async recordChange(
    change: SyncChangeCreateInput,
    executor: DbExecutor = db,
  ) {
    const id = randomUUID();
    await executor("sync_changes").insert({
      id,
      user_id: change.userId,
      entity_type: change.entityType,
      entity_id: change.entityId,
      op: change.op,
      version: change.version,
      payload_json: JSON.stringify(change.payload),
      changed_at: new Date().toISOString(),
      device_id: change.deviceId,
      mutation_id: change.mutationId,
    });
    return id;
  },

  async findMutation(
    userId: string,
    deviceId: string,
    mutationId: string,
    executor: DbExecutor = db,
  ) {
    const row = await executor("sync_changes")
      .where({
        user_id: userId,
        device_id: deviceId,
        mutation_id: mutationId,
      })
      .first();
    if (!row) return undefined;
    return {
      entityType: row.entity_type,
      entityId: row.entity_id,
      op: row.op,
      version: Number(row.version),
      payload: row.payload_json ? JSON.parse(row.payload_json) : null,
    };
  },

  async pullSince(userId: string, sinceVersion: number, pageSize: number) {
    const rows = await db("sync_changes")
      .where("user_id", userId)
      .where("version", ">", sinceVersion)
      .orderBy("version", "asc")
      .limit(pageSize + 1);

    const hasMore = rows.length > pageSize;
    const page = rows.slice(0, pageSize);

    const changes = page.map((row) => ({
      version: row.version,
      entityType: row.entity_type,
      entityId: row.entity_id,
      op: row.op,
      changedAt: row.changed_at,
      payload: row.payload_json ? JSON.parse(row.payload_json) : null,
    }));

    const nextSinceVersion = changes.length
      ? changes[changes.length - 1].version
      : sinceVersion;

    return {
      changes,
      nextSinceVersion,
      hasMore,
    };
  },
};
