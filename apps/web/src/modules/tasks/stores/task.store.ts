import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { TaskAPI, type Task, type TaskInput, type TaskPatch } from "../api/task.api";

export const useTaskStore = defineStore("tasks", () => {
  const tasks = ref<Task[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const loaded = ref(false);
  const activeTasks = computed(() => tasks.value.filter((task) => !task.isCompleted));
  const completedTasks = computed(() => tasks.value.filter((task) => !!task.isCompleted));

  async function fetchTasks(force = false) {
    if (loading.value || (loaded.value && !force)) return;
    loading.value = true;
    try {
      const firstPage = await TaskAPI.page(1, 100);
      const items = [...firstPage.items];
      const pageCount = Math.ceil(firstPage.total / 100);
      for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
        const page = await TaskAPI.page(pageNumber, 100);
        items.push(...page.items);
      }
      tasks.value = items;
      total.value = firstPage.total;
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function createTask(input: TaskInput) {
    const created = await TaskAPI.create(input);
    tasks.value = [created, ...tasks.value];
    total.value += 1;
    return created;
  }

  async function updateTask(id: string, patch: TaskPatch) {
    const updated = await TaskAPI.update(id, patch);
    tasks.value = tasks.value.map((task) => task.id === id ? updated : task);
    return updated;
  }

  async function deleteTask(id: string) {
    await TaskAPI.remove(id);
    tasks.value = tasks.value.filter((task) => task.id !== id);
    total.value = Math.max(0, total.value - 1);
  }

  function reset() {
    tasks.value = [];
    total.value = 0;
    loaded.value = false;
  }

  return { tasks, total, loading, loaded, activeTasks, completedTasks, fetchTasks, createTask, updateTask, deleteTask, reset };
});
