import { randomUUID } from "crypto";
import { db } from "../../db/knex";
import { TaskRow } from "../types/task.type";

export const TaskRepo = {
  async findById(userId: string, taskId: string) {
    return await db<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .whereNull("deleted_at")
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

  async create(userId: string, task: Partial<TaskRow>) {
    const id = randomUUID();
    const now = new Date().toISOString();
    task.id = id;
    task.created_at = now;
    task.updated_at = now;
    const ret = await db<TaskRow>("tasks").insert({ ...task, user_id: userId });
    return db<TaskRow>("tasks").where({ id }).first();
  },

  async update(userId: string, taskId: string, patch: Partial<TaskRow>) {
    const now = new Date().toISOString();
    return await db<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .update({ ...patch, updated_at: now });
  },

  async softDelete(userId: string, taskId: string, deletedAt: string) {
    return await db<TaskRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .update({ deleted_at: deletedAt });
  },
};
