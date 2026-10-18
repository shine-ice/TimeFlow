import type { Knex } from "knex";
import type {
  Task,
  TaskCreateInput,
  TaskDbRow,
  TaskPatch,
} from "../types/task.type";

type DbExecutor = Knex | Knex.Transaction;

type TaskIdentity = {
  userId: string;
  taskId: string;
};

type TaskPageParams = {
  userId: string;
  page: number;
  pageSize: number;
};

function toTask(row: TaskDbRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncVersion: row.sync_version,
  };
}

function toTaskDbPatch(patch: TaskPatch): Partial<TaskDbRow> {
  const dbPatch: Partial<TaskDbRow> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.startAt !== undefined) dbPatch.start_at = patch.startAt;
  if (patch.endAt !== undefined) dbPatch.end_at = patch.endAt;
  if (patch.isCompleted !== undefined) dbPatch.is_completed = patch.isCompleted;
  if (patch.completedAt !== undefined) dbPatch.completed_at = patch.completedAt;
  return dbPatch;
}

async function findTask(
  executor: DbExecutor,
  { userId, taskId }: TaskIdentity,
  includeDeleted: boolean,
) {
  const query = executor<TaskDbRow>("tasks").where({
    user_id: userId,
    id: taskId,
  });
  if (!includeDeleted) query.whereNull("deleted_at");
  const row = await query.first();
  return row ? toTask(row) : undefined;
}

export const TaskRepo = {
  async findById(executor: DbExecutor, params: TaskIdentity) {
    return findTask(executor, params, false);
  },

  async findByIdIncludingDeleted(executor: DbExecutor, params: TaskIdentity) {
    return findTask(executor, params, true);
  },

  async findByIdIncludingDeletedForUpdate(
    executor: Knex.Transaction,
    { userId, taskId }: TaskIdentity,
  ) {
    const row = await executor<TaskDbRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .forUpdate()
      .first();
    return row ? toTask(row) : undefined;
  },

  async listByUserId(
    executor: DbExecutor,
    { userId, page, pageSize }: TaskPageParams,
  ) {
    const offset = (page - 1) * pageSize;

    const rows = await executor<TaskDbRow>("tasks")
      .where({ user_id: userId })
      .whereNull("deleted_at")
      .orderBy("updated_at", "desc")
      .offset(offset)
      .limit(pageSize);

    const [{ total }] = await executor<TaskDbRow>("tasks")
      .where({ user_id: userId })
      .whereNull("deleted_at")
      .count({ total: "*" });

    return {
      items: rows.map(toTask),
      total: Number(total || 0),
    };
  },

  async createWithId(
    executor: DbExecutor,
    {
      userId,
      taskId,
      task,
      syncVersion,
    }: TaskIdentity & { task: TaskCreateInput; syncVersion: number },
  ) {
    const now = new Date().toISOString();
    await executor<TaskDbRow>("tasks").insert({
      ...toTaskDbPatch(task),
      id: taskId,
      user_id: userId,
      title: task.title,
      description: task.description ?? "",
      is_completed: task.isCompleted ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_version: syncVersion,
    });
    return findTask(executor, { userId, taskId }, true);
  },

  async updateForSync(
    executor: DbExecutor,
    {
      userId,
      taskId,
      patch,
      syncVersion,
    }: TaskIdentity & { patch: TaskPatch; syncVersion: number },
  ) {
    const now = new Date().toISOString();
    const updated = await executor<TaskDbRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .whereNull("deleted_at")
      .update({
        ...toTaskDbPatch(patch),
        updated_at: now,
        sync_version: syncVersion,
      });
    if (!updated) return undefined;
    return findTask(executor, { userId, taskId }, true);
  },

  async softDeleteForSync(
    executor: DbExecutor,
    {
      userId,
      taskId,
      deletedAt,
      syncVersion,
    }: TaskIdentity & { deletedAt: string; syncVersion: number },
  ) {
    return executor<TaskDbRow>("tasks")
      .where({ user_id: userId, id: taskId })
      .whereNull("deleted_at")
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
        sync_version: syncVersion,
      });
  },
};
