export type TaskDbRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at?: string | null;
  end_at?: string | null;
  is_completed: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sync_version: number;
};

export type Task = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startAt?: string | null;
  endAt?: string | null;
  isCompleted: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncVersion: number;
};

export type TaskCreateInput = {
  title: string;
  description?: string;
  startAt?: string | null;
  endAt?: string | null;
  isCompleted?: number;
  completedAt?: string | null;
};

export type TaskPatch = Partial<TaskCreateInput>;
