import { randomUUID } from "crypto";
import type { Knex } from "knex";
import type {
  SyncChangeCreateInput,
  SyncChangeDbRow,
  SyncUserVersionDbRow,
} from "../types/sync.type";

type DbExecutor = Knex | Knex.Transaction;

type UserIdentity = {
  userId: string;
};

export const SyncRepo = {
  async ensureUserVersionRow(
    executor: DbExecutor,
    { userId }: UserIdentity,
  ) {
    await executor<SyncUserVersionDbRow>("sync_user_versions")
      .insert({
        user_id: userId,
        last_version: 0,
        updated_at: new Date().toISOString(),
      })
      .onConflict("user_id")
      .ignore();
  },

  async getLastVersion(executor: DbExecutor, { userId }: UserIdentity) {
    const row = await executor<SyncUserVersionDbRow>("sync_user_versions")
      .where("user_id", userId)
      .first();
    return Number(row?.last_version ?? 0);
  },

  async lockUserVersion(
    executor: Knex.Transaction,
    { userId }: UserIdentity,
  ) {
    await this.ensureUserVersionRow(executor, { userId });
    const row = await executor<SyncUserVersionDbRow>("sync_user_versions")
      .where("user_id", userId)
      .forUpdate()
      .first();
    return Number(row?.last_version ?? 0);
  },

  async nextVersion(executor: DbExecutor, { userId }: UserIdentity) {
    await this.ensureUserVersionRow(executor, { userId });
    await executor<SyncUserVersionDbRow>("sync_user_versions")
      .where("user_id", userId)
      .increment("last_version", 1)
      .update({ updated_at: new Date().toISOString() });
    return this.getLastVersion(executor, { userId });
  },

  async recordChange(
    executor: DbExecutor,
    change: SyncChangeCreateInput,
  ) {
    const id = randomUUID();
    await executor<SyncChangeDbRow>("sync_changes").insert({
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
    executor: DbExecutor,
    {
      userId,
      deviceId,
      mutationId,
    }: UserIdentity & { deviceId: string; mutationId: string },
  ) {
    const row = await executor<SyncChangeDbRow>("sync_changes")
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

  async pullSince(
    executor: DbExecutor,
    {
      userId,
      sinceVersion,
      pageSize,
    }: UserIdentity & { sinceVersion: number; pageSize: number },
  ) {
    const rows = await executor<SyncChangeDbRow>("sync_changes")
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
