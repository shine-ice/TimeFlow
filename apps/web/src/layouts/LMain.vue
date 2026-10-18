<template>
  <el-container class="main-layout">
    <el-aside width="var(--sidebar-width)">
      <AppSidebar />
    </el-aside>
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import AppSidebar from "./components/AppSidebar.vue";
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
  min-height: 0;
}

.main-content {
  min-height: 0;
  overflow: hidden;
}
</style>
