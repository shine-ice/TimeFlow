import type { Knex } from "knex";
import { db } from "../../db/knex";
import { TaskRow } from "../types/task.type";

type DbExecutor = Knex | Knex.Transaction;

export const TaskRepo = {
  async findById(userId: string, taskId: string, executor: DbExecutor = db) {
    return await executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .whereNull("deleted_at")
      .first();
  },

  async findByIdIncludingDeleted(
    userId: string,
    taskId: string,
    executor: DbExecutor = db,
  ) {
    return await executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .first();
  },

  async findByIdIncludingDeletedForUpdate(
    userId: string,
    taskId: string,
    executor: Knex.Transaction,
  ) {
    return executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .forUpdate()
      .first();
  },

  async listByUserId(userId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;

    const items = await db<TaskRow>("tasks")
      .where({ user_id: userId })
      .whereNull("deleted_at")
      .orderBy("updated_at", "desc")
      .offset(offset)
      .limit(pageSize);

    const [{ total }] = await db<TaskRow>("tasks")
      .where({ user_id: userId })
      .whereNull("deleted_at")
      .count({ total: "*" });

    return {
      items,
      total: Number(total || 0),
    };
  },

  async createWithId(
    userId: string,
    taskId: string,
    task: Partial<TaskRow>,
    syncVersion: number,
    executor: DbExecutor = db,
  ) {
    const now = new Date().toISOString();
    await executor<TaskRow>("tasks").insert({
      ...task,
      id: taskId,
      user_id: userId,
      description: task.description ?? "",
      is_completed: task.is_completed ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_version: syncVersion,
    });
    return executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .first();
  },

  async updateForSync(
    userId: string,
    taskId: string,
    patch: Partial<TaskRow>,
    syncVersion: number,
    executor: DbExecutor = db,
  ) {
    const now = new Date().toISOString();
    const updated = await executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .whereNull("deleted_at")
      .update({ ...patch, updated_at: now, sync_version: syncVersion });
    if (!updated) return undefined;
    return executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .first();
  },

  async softDeleteForSync(
    userId: string,
    taskId: string,
    deletedAt: string,
    syncVersion: number,
    executor: DbExecutor = db,
  ) {
    return executor<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .whereNull("deleted_at")
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
        sync_version: syncVersion,
      });
  },
};
