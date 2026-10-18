import type { RouteRecordRaw } from "vue-router";

export const timelineRoutes: RouteRecordRaw[] = [
  {
    path: "/timeline",
    name: "timeline",
    component: () => import("./views/VTimeline.vue"),
    meta: { requiresAuth: true },
  },
];
