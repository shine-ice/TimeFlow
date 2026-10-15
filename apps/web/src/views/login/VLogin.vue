<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const isRegister = ref(false);
const name = ref("");
const email = ref("");
const password = ref("");
const pending = ref(false);
const error = ref("");

function toggleMode() {
  isRegister.value = !isRegister.value;
  error.value = "";
}

async function submit() {
  error.value = "";
  pending.value = true;
  try {
    if (isRegister.value) {
      await auth.register({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
      });
    } else {
      await auth.login(email.value.trim(), password.value);
    }
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.push(redirect);
  } catch (err: any) {
    error.value =
      err?.response?.data?.error ||
      "Login failed. Please check your credentials.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-hero">
      <div class="hero-card">
        <div class="hero-brand">
          <span class="brand-dot" />
          <span class="brand-text">TickTick</span>
        </div>
        <div class="hero-title">Stay on top of your day</div>
        <div class="hero-subtitle">
          Organize tasks, build habits, and focus with pomodoro sessions.
          Everything you need in one calm workspace.
        </div>
        <div class="hero-badges">
          <span class="badge">Inbox clarity</span>
          <span class="badge">Smart lists</span>
          <span class="badge">Focus stats</span>
        </div>
      </div>
    </div>

    <div class="login-panel">
      <el-card class="tt-card form-card">
        <div class="tt-section-title">
          {{ isRegister ? "Create account" : "Welcome back" }}
        </div>
        <div class="tt-subtle">
          {{
            isRegister ? "Start organizing in seconds." : "Sign in to continue."
          }}
        </div>

        <el-form label-position="top" class="form" @submit.prevent>
          <el-form-item v-if="isRegister" label="Name">
            <el-input v-model="name" placeholder="Your name" />
          </el-form-item>
          <el-form-item label="Email">
            <el-input v-model="email" placeholder="you@example.com" />
          </el-form-item>
          <el-form-item label="Password">
            <el-input
              v-model="password"
              type="password"
              placeholder="At least 6 characters"
              show-password
            />
          </el-form-item>
          <div class="form-actions">
            <el-button type="primary" :loading="pending" @click="submit">
              {{ isRegister ? "Create account" : "Sign in" }}
            </el-button>
            <el-button text @click="toggleMode">
              {{
                isRegister
                  ? "Have an account? Sign in"
                  : "New here? Create account"
              }}
            </el-button>
          </div>
        </el-form>
        <el-alert v-if="error" :title="error" type="error" show-icon />
      </el-card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: linear-gradient(135deg, #fff5f5, #f8fafc 60%);
}
.login-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.hero-card {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hero-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 20px;
}
.brand-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--tt-red), var(--tt-orange));
}
.hero-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--tt-slate-900);
}
.hero-subtitle {
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.hero-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.badge {
  padding: 6px 12px;
  background: #fff;
  border-radius: 999px;
  border: 1px solid var(--el-border-color);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fff;
}
.form-card {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form {
  margin-top: 8px;
}
.form-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }
  .login-hero {
    display: none;
  }
}
</style>
