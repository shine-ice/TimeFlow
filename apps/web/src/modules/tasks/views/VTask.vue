<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useTaskStore } from "../stores/task.store";
import type { Task } from "../api/task.api";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";

const store = useTaskStore();
const auth = useAuthStore();
const router = useRouter();
const filter = ref<"all" | "open" | "done">("all");
const search = ref("");
const dialogOpen = ref(false);
const saving = ref(false);
const editing = ref<Task | null>(null);
const form = ref({ title: "", description: "" });
const visibleTasks = computed(() => {
  let list = filter.value === "open" ? store.activeTasks : filter.value === "done" ? store.completedTasks : store.tasks;
  const query = search.value.trim().toLocaleLowerCase();
  if (query) list = list.filter((task) => `${task.title} ${task.description ?? ""}`.toLocaleLowerCase().includes(query));
  return list;
});
const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

onMounted(refresh);

function openCreate() {
  editing.value = null;
  form.value = { title: "", description: "" };
  dialogOpen.value = true;
}
function openEdit(task: Task) {
  editing.value = task;
  form.value = { title: task.title, description: task.description ?? "" };
  dialogOpen.value = true;
}
async function saveTask() {
  const title = form.value.title.trim();
  if (!title) return ElMessage.warning("Add a task title first.");
  saving.value = true;
  try {
    const input = { title, description: form.value.description.trim() };
    if (editing.value) await store.updateTask(editing.value.id, input);
    else await store.createTask(input);
    dialogOpen.value = false;
    ElMessage.success(editing.value ? "Task updated" : "Task added");
  } catch { /* request interceptor already normalizes; show a concise message below */
    ElMessage.error("Could not save this task. Please try again.");
  } finally { saving.value = false; }
}
async function toggleTask(task: Task) {
  try {
    const done = !task.isCompleted;
    await store.updateTask(task.id, { isCompleted: done ? 1 : 0, completedAt: done ? new Date().toISOString() : null });
  } catch { ElMessage.error("Could not update this task."); }
}
async function removeTask(task: Task) {
  try {
    await ElMessageBox.confirm(`Delete “${task.title}”? This cannot be undone.`, "Delete task", { type: "warning", confirmButtonText: "Delete", cancelButtonText: "Cancel" });
    await store.deleteTask(task.id);
    ElMessage.success("Task deleted");
  } catch (error) {
    if (error !== "cancel" && error !== "close") ElMessage.error("Could not delete this task.");
  }
}
async function refresh() {
  try { await store.fetchTasks(true); }
  catch { ElMessage.error("Could not load tasks. Check your connection and try again."); }
}
async function signOut() {
  await auth.logout();
  store.reset();
  await router.push("/login");
}
function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
</script>

<template>
  <div class="workspace">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">t</span><span>timeflow</span></div>
      <div class="profile"><div class="avatar">{{ (auth.user?.name || "U").slice(0, 1).toUpperCase() }}</div><div class="profile-copy"><strong>{{ auth.user?.name || "My workspace" }}</strong><span>Personal space</span></div><el-dropdown trigger="click"><button class="icon-button" aria-label="Account menu">•••</button><template #dropdown><el-dropdown-menu><el-dropdown-item @click="signOut">Sign out</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div>
      <div class="nav-label">WORKSPACE</div>
      <button class="nav-item selected"><span class="nav-icon">▦</span><span>All tasks</span><span class="nav-count">{{ store.total }}</span></button>
      <button class="nav-item" @click="filter = 'open'"><span class="nav-icon">◷</span><span>Upcoming</span><span class="nav-count">{{ store.activeTasks.length }}</span></button>
      <button class="nav-item" @click="filter = 'done'"><span class="nav-icon">✓</span><span>Completed</span></button>
      <div class="sidebar-bottom"><div class="focus-card"><span class="focus-spark">✳</span><strong>Make room to focus</strong><p>Small steps add up. Pick one thing and get started.</p><button @click="openCreate">Add a task <span>↗</span></button></div><div class="sidebar-foot">A little progress, every day.</div></div>
    </aside>

    <main class="main-panel">
      <header class="topbar"><div class="breadcrumb">Workspace <span>/</span> Tasks</div><div class="top-actions"><span class="today-label">{{ today }}</span><el-button class="refresh-button" circle aria-label="Refresh tasks" @click="refresh">↻</el-button></div></header>
      <section class="content">
        <div class="page-heading"><div><div class="eyebrow">YOUR SPACE, YOUR PACE</div><h1>Tasks</h1><p class="heading-note">A clear mind starts with a clear list.</p></div><el-button type="primary" class="add-button" @click="openCreate"><span class="plus">＋</span> New task</el-button></div>
        <div class="summary-row"><div class="summary-card"><span class="summary-icon lavender">◷</span><div><span class="summary-value">{{ store.activeTasks.length }}</span><span class="summary-caption">To do</span></div><span class="summary-side">Keep it moving</span></div><div class="summary-card"><span class="summary-icon mint">✓</span><div><span class="summary-value">{{ store.completedTasks.length }}</span><span class="summary-caption">Completed</span></div><span class="summary-side">Look at you go</span></div><div class="progress-card"><div class="progress-head"><span>Daily progress</span><strong>{{ store.tasks.length ? Math.round(store.completedTasks.length / store.tasks.length * 100) : 0 }}%</strong></div><el-progress :percentage="store.tasks.length ? Math.round(store.completedTasks.length / store.tasks.length * 100) : 0" :show-text="false" :stroke-width="7" color="#8c78dc"/><span class="progress-caption">{{ store.completedTasks.length }} of {{ store.tasks.length }} tasks done</span></div></div>
        <div class="list-toolbar"><div class="filters"><button v-for="item in [{ id: 'all', label: 'All tasks' }, { id: 'open', label: 'To do' }, { id: 'done', label: 'Completed' }]" :key="item.id" :class="['filter-button', { active: filter === item.id }]" @click="filter = item.id as typeof filter">{{ item.label }}</button></div><el-input v-model="search" class="search-input" placeholder="Search tasks" clearable><template #prefix><span>⌕</span></template></el-input></div>
        <div v-loading="store.loading" class="task-list">
          <template v-if="visibleTasks.length">
            <article v-for="task in visibleTasks" :key="task.id" :class="['task-row', { completed: task.isCompleted }]">
              <button :class="['check-button', { checked: task.isCompleted }]" :aria-label="task.isCompleted ? 'Mark as to do' : 'Complete task'" @click="toggleTask(task)">{{ task.isCompleted ? '✓' : '' }}</button>
              <div class="task-copy" @click="openEdit(task)"><div class="task-title">{{ task.title }}</div><div v-if="task.description" class="task-description">{{ task.description }}</div></div>
              <span v-if="task.endAt" class="task-date">◷ {{ formatDate(task.endAt) }}</span>
              <div class="task-actions"><el-button text aria-label="Edit task" @click="openEdit(task)">✎</el-button><el-button text class="delete-action" aria-label="Delete task" @click="removeTask(task)">⌫</el-button></div>
            </article>
          </template>
          <div v-else-if="!store.loading" class="empty-state"><div class="empty-art">✳</div><strong>{{ search ? "No matching tasks" : filter === 'done' ? "Nothing completed yet" : "Your list is clear" }}</strong><p>{{ search ? "Try another search or clear the filter." : "Add a task to give your day a little direction." }}</p><el-button v-if="!search && filter !== 'done'" type="primary" plain @click="openCreate">Create your first task</el-button></div>
        </div>
        <footer class="list-footer"><span>Showing {{ visibleTasks.length }} of {{ store.total }} tasks</span><span><i class="status-dot"/> Synced to your workspace</span></footer>
      </section>
    </main>

    <el-dialog v-model="dialogOpen" :title="editing ? 'Edit task' : 'New task'" width="min(480px, calc(100vw - 32px))" destroy-on-close>
      <el-form label-position="top" @submit.prevent="saveTask"><el-form-item label="Task name" required><el-input v-model="form.title" maxlength="160" show-word-limit placeholder="What needs to get done?" @keyup.enter="saveTask"/></el-form-item><el-form-item label="Notes"><el-input v-model="form.description" type="textarea" :rows="4" maxlength="2000" placeholder="Add a little more detail (optional)"/></el-form-item></el-form>
      <template #footer><el-button @click="dialogOpen = false">Cancel</el-button><el-button type="primary" :loading="saving" @click="saveTask">{{ editing ? "Save changes" : "Add task" }}</el-button></template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.workspace { min-height: 100vh; display: grid; grid-template-columns: 252px minmax(0, 1fr); background: #f7f8fc; color: #343348; font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
.sidebar { background: #fff; border-right: 1px solid #ececf2; padding: 27px 17px 18px; display: flex; flex-direction: column; min-height: 100vh; box-sizing: border-box; }
.brand { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:750; letter-spacing:-.5px; color:#37354f; padding:0 11px 34px; }.brand-mark { display:grid; place-items:center; width:28px;height:28px;border-radius:9px;background:#8976d5;color:white;font-weight:800;font-size:17px; }
.profile { display:flex;align-items:center;gap:10px;padding:0 9px 27px; }.avatar { width:34px;height:34px;border-radius:12px;background:#f4e6df;color:#98664f;display:grid;place-items:center;font-weight:700; }.profile-copy { min-width:0;display:flex;flex:1;flex-direction:column;line-height:1.35; }.profile-copy strong { font-size:12px;color:#414055; }.profile-copy span { font-size:11px;color:#9998aa;margin-top:3px; }.icon-button { border:0;background:none;color:#9796a8;cursor:pointer;letter-spacing:1px; }.nav-label { font-size:10px;letter-spacing:1.2px;font-weight:700;color:#a6a4b3;padding:0 11px 10px; }.nav-item { width:100%;display:flex;align-items:center;gap:12px;height:41px;padding:0 11px;border:0;border-radius:9px;background:none;color:#77768b;font:inherit;text-align:left;cursor:pointer;margin:2px 0; }.nav-item:hover,.nav-item.selected { background:#f3f1fb;color:#7060bb; }.nav-item.selected { font-weight:650; }.nav-icon { width:17px;text-align:center;font-size:16px; }.nav-count { margin-left:auto;color:#9b99aa;font-size:11px; }.sidebar-bottom { margin-top:auto; }.focus-card { background:#f7f5fd;border:1px solid #efedf9;border-radius:13px;padding:15px 14px;color:#4f4b68; }.focus-spark { color:#8875d2;display:block;font-size:18px;margin-bottom:7px; }.focus-card strong { font-size:12px; }.focus-card p { color:#9996ac;font-size:11px;line-height:1.55;margin:6px 0 12px; }.focus-card button { border:0;background:transparent;padding:0;color:#7967c4;font:600 11px inherit;cursor:pointer; }.focus-card button span { margin-left:5px; }.sidebar-foot { text-align:center;font-size:10px;color:#b0afbc;padding:18px 0 2px; }
.main-panel { min-width:0; }.topbar { height:70px;box-sizing:border-box;border-bottom:1px solid #ececf2;background:rgba(255,255,255,.72);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(22px,5vw,68px); }.breadcrumb { color:#9b99aa;font-size:12px; }.breadcrumb span { padding:0 8px;color:#cccbd4; }.top-actions { display:flex;align-items:center;gap:14px;color:#9291a3;font-size:11px; }.refresh-button { color:#77758d!important;border-color:#e9e8ef!important;background:#fff!important; }.content { max-width:1030px;margin:0 auto;padding:39px clamp(22px,5vw,68px) 40px; }.page-heading { display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px; }.eyebrow { color:#9382d0;letter-spacing:1.5px;font-size:9px;font-weight:750;margin-bottom:7px; }.page-heading h1 { margin:0;color:#36344d;font-size:31px;letter-spacing:-1.2px;line-height:1.2;font-weight:720; }.heading-note { color:#9998aa;margin:7px 0 0;font-size:12px; }.add-button { border:0!important;border-radius:9px!important;height:38px;padding:0 16px!important;background:#8170ca!important;box-shadow:0 5px 12px #8170ca2b;font-size:12px!important; }.add-button:hover { background:#7563bd!important; }.plus {font-size:17px;margin-right:5px;line-height:1;}
.summary-row { display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:12px;margin-bottom:25px; }.summary-card,.progress-card { min-height:86px;background:white;border:1px solid #eeedf3;border-radius:12px;padding:15px 17px;box-sizing:border-box;display:flex;align-items:center;gap:12px; }.summary-icon { width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-size:16px; }.lavender {background:#f2effb;color:#8673cb;}.mint {background:#eaf6f1;color:#6eae91;}.summary-card>div {display:flex;flex-direction:column;line-height:1.2;gap:4px;}.summary-value {font-size:20px;font-weight:700;color:#444258;letter-spacing:-.5px;}.summary-caption {font-size:10px;color:#a09eaf;}.summary-side {margin-left:auto;color:#b0aebe;font-size:9px; }.progress-card {display:block;padding:14px 17px;}.progress-head {display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#8c8a9e;margin-bottom:9px;}.progress-head strong {color:#7564bd;font-size:12px;}.progress-caption {display:block;font-size:9px;color:#aaa8b6;margin-top:7px; }
.list-toolbar {display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e9e8ef;padding:0 0 13px;gap:12px; }.filters {display:flex;gap:4px; }.filter-button {border:0;background:transparent;color:#9997a8;font:inherit;font-size:11px;padding:7px 11px;border-radius:7px;cursor:pointer; }.filter-button:hover {background:#f0eff6;color:#7060bb;}.filter-button.active {background:#efedf8;color:#7160b9;font-weight:650; }.search-input {width:190px; }.search-input :deep(.el-input__wrapper) {box-shadow:0 0 0 1px #ecebf2 inset!important;border-radius:8px;height:31px;background:#fff; }.search-input :deep(.el-input__inner) {font-size:11px; }.search-input :deep(.el-input__prefix) {color:#aaa8b7;font-size:18px; }
.task-list {min-height:300px; }.task-row {min-height:66px;border-bottom:1px solid #eeedf3;display:flex;align-items:center;gap:13px;padding:8px 3px;box-sizing:border-box; }.check-button {flex:0 0 18px;width:18px;height:18px;border:1.5px solid #d6d4e0;border-radius:6px;background:#fff;color:#fff;font-size:11px;cursor:pointer;display:grid;place-items:center;padding:0; }.check-button:hover {border-color:#8976d5; }.check-button.checked {background:#8a78d1;border-color:#8a78d1; }.task-copy {flex:1;min-width:0;cursor:pointer; }.task-title {font-size:12px;color:#504e63;font-weight:570; }.task-description {font-size:10px;color:#aaa8b5;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:560px; }.completed .task-title {text-decoration:line-through;color:#aaa8b6; }.task-date {color:#a09eaf;font-size:10px;white-space:nowrap; }.task-actions {display:flex;opacity:0;transition:opacity .15s; }.task-row:hover .task-actions,.task-actions:focus-within {opacity:1; }.task-actions :deep(.el-button) {padding:6px;color:#9694a6;font-size:15px; }.task-actions :deep(.delete-action:hover) {color:#dd7777; }.empty-state {height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center; }.empty-art {width:48px;height:48px;border-radius:16px;background:#f0eef9;color:#8b79d3;display:grid;place-items:center;font-size:22px;margin-bottom:14px; }.empty-state strong {font-size:13px;color:#57556b; }.empty-state p {margin:5px 0 15px;color:#aaa8b7;font-size:11px; }.empty-state :deep(.el-button) {font-size:11px; }.list-footer {display:flex;justify-content:space-between;color:#aaa8b5;font-size:9px;padding-top:14px; }.status-dot {display:inline-block;width:6px;height:6px;border-radius:50%;background:#7bc4a1;margin-right:5px;vertical-align:1px; }
@media (max-width: 760px) {
  .workspace { grid-template-columns: 1fr; }
  .sidebar { min-height: 0; padding: 15px 18px; border-right: 0; border-bottom: 1px solid #ececf2; display: block; }
  .brand { padding: 0 2px 14px; }
  .profile, .nav-label, .nav-item:not(.selected), .sidebar-bottom { display: none; }
  .nav-item.selected { width: auto; height: 32px; padding: 0 10px; }
  .topbar { height: 54px; padding: 0 20px; }
  .content { padding: 28px 20px; }
  .summary-row { grid-template-columns: 1fr 1fr; }
  .progress-card { grid-column: 1 / -1; }
  .summary-side { display: none; }
  .page-heading h1 { font-size: 27px; }
  .task-actions { opacity: 1; }
  .search-input { width: min(155px, 45vw); }
}
@media (max-width: 430px) {
  .today-label { display: none; }
  .summary-card { padding: 12px; }
  .summary-side { display: none; }
  .list-toolbar { align-items: flex-start; flex-direction: column; }
  .search-input { width: 100%; }
  .task-row { gap: 9px; }
  .task-date { display: none; }
  .task-actions :deep(.el-button) { padding: 5px 3px; }
  .list-footer { gap: 10px; }
}
</style>
