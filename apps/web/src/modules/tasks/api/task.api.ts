import http from "@/api/http";

export interface Task {
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
  syncVersion: number;
}

export interface TaskPage {
  items: Task[];
  total: number;
}

export interface TaskInput {
  title: string;
  description?: string;
}

export type TaskPatch = Partial<TaskInput> & {
  isCompleted?: number;
  completedAt?: string | null;
};

export const TaskAPI = {
  page(page = 1, pageSize = 100) {
    return http.get<never, TaskPage>("/tasks", { params: { page, pageSize } });
  },
  create(input: TaskInput) {
    return http.post<never, Task>("/tasks", input);
  },
  update(id: string, patch: TaskPatch) {
    return http.patch<never, Task>(`/tasks/${encodeURIComponent(id)}`, patch);
  },
  remove(id: string) {
    return http.delete<never, { id: string }>(`/tasks/${encodeURIComponent(id)}`);
  },
};
