import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/login/VLogin.vue"),
      meta: {
        guest: true,
      },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.guest) {
    if (to.path === "/login" && auth.accessToken) return { path: "/" };
    return true;
  }
  if (!auth.accessToken) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
