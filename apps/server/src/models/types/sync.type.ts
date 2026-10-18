export const syncEntityTypes = ["task", "list", "habit", "tag"] as const;

export type SyncEntityType = (typeof syncEntityTypes)[number];

// db
export type SyncChangeDbRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  op: string;
  changed_at: string;
  version: number;
  payload_json: string;
  device_id?: string | null;
  mutation_id?: string | null;
};

export type SyncUserVersionDbRow = {
  user_id: string;
  last_version: number;
  updated_at: string;
};

// api
export type SyncChangeCreateInput = {
  userId: string;
  entityType: string;
  entityId: string;
  op: string;
  version: number;
  payload: unknown;
  deviceId: string;
  mutationId: string;
};
