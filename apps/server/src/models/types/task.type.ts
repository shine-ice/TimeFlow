export type TaskRow = {
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
};
