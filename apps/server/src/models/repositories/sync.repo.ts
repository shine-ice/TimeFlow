import { randomUUID } from "crypto";
import { db } from "../../db/knex";
import { SyncChangeRow } from "../types/sync.type";

export const SyncRepo = {
  async ensureUserVersionRow(userId: string) {
    const row = await db("sync_user_versions").where("user_id", userId).first();
    if (!row) {
      await db("sync_user_versions").insert({
        user_id: userId,
        last_version: 0,
        updated_at: new Date().toISOString(),
      });
    }
  },

  async nextVersion(userId: string) {
    await this.ensureUserVersionRow(userId);
    const row = await db("sync_user_versions").where("user_id", userId).first();
    const next = Number(row.last_version) + 1;

    await db("sync_user_versions").where("user_id", userId).update({
      last_version: next,
      updated_at: new Date().toISOString(),
    });

    return next;
  },

  async recordChange(change: SyncChangeRow) {
    const id = randomUUID();
    change.id = id;
    await db("sync_changes").insert(change);
    return id;
  },

  async pullSince(userId: string, sinceVersion: number, pageSize: number) {
    const rows = await db("sync_changes")
      .where("user_id", userId)
      .where("version", ">", sinceVersion)
      .orderBy("version", "asc")
      .limit(pageSize);

    const changes = rows.map((row) => ({
      version: row.version,
      entityType: row.entity_type,
      entityId: row.entity_id,
      op: row.op,
      changedAt: row.changed_at,
      payloadJson: row.payload_json ? JSON.parse(row.payload_json) : null,
    }));

    const nextSinceVersion = changes.length
      ? changes[changes.length - 1].version
      : sinceVersion;
    return {
      changes,
      nextSinceVersion,
      hasMore: rows.length === pageSize,
    };
  },
};
