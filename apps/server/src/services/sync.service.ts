import { db } from "../db/knex";
import { SyncRepo } from "../models/repositories/sync.repo";
import { TaskService } from "./task.service";

export type PushChange = {
  entityType: "task";
  entityId: string;
  op: "create" | "update" | "delete";
  baseVersion: number;
  clientUpdatedAt?: string;
  deviceId?: string;
  patch?: any;
};

export const SyncService = {
  async pull(userId: string, sinceVersion: number, pageSize: number) {
    return await SyncRepo.pullSince(userId, sinceVersion, pageSize);
  },

  async push(userId: string, deviceId: string, changes: PushChange[]) {},
};
