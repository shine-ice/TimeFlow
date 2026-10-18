// db
export type SyncChangeRow = {
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

export type SyncUserVersionRow = {
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
  payload: any;
  deviceId: string;
  mutationId: string;
};
