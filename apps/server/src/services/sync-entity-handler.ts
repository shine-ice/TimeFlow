import type { Knex } from "knex";
import type { SyncEntityType } from "../models/types/sync.type";

type SyncEntityState = {
  syncVersion: number;
  deletedAt?: string | null;
};

type EntityIdentity = {
  userId: string;
  entityId: string;
};

type ApplyChangeParams = EntityIdentity & {
  op: "create" | "update" | "delete";
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
