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
};

export type SyncUserVersionRow = {
  user_id: string;
  last_version: number;
  updated_at: string;
};

// api
