<template>
  <el-container>
    <el-aside width="var(--sidebar-width)">
      <AppSidebar />
    </el-aside>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import AppSidebar from "./components/AppSidebar.vue";
</script>

<style lang="scss" scoped></style>
