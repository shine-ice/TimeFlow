import type { RouteRecordRaw } from "vue-router";

export const calendarRoutes: RouteRecordRaw[] = [
  {
    path: "/calendar",
    name: "calendar",
    component: () => import("./views/VCalendar.vue"),
    meta: { requiresAuth: true },
  },
];
