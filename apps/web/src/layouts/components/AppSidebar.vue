<template>
  <div class="app-sidebar">
    <el-menu
      default-active="2"
      class="top-menu"
      :collapse="isCollapse"
      @open="handleOpen"
      @close="handleClose"
    >
      <el-menu-item index="1" @click="router.push('/tasks')">
        <el-icon><icon-menu /></el-icon>
        <template #title>Task</template>
      </el-menu-item>
      <el-menu-item index="2" @click="router.push('/timeline')">
        <el-icon><trophy /></el-icon>
        <template #title>Timeline</template>
      </el-menu-item>
      <el-menu-item index="3" @click="router.push('/calendar')">
        <el-icon><calendar /></el-icon>
        <template #title>Calendar</template>
      </el-menu-item>
      <el-menu-item index="4">
        <el-icon><setting /></el-icon>
        <template #title>Settings</template>
      </el-menu-item>
    </el-menu>
    <el-menu
      default-active="2"
      class="bottom-menu"
      :collapse="isCollapse"
      @open="handleOpen"
      @close="handleClose"
    >
      <el-menu-item index="2" @click="router.push('/tasks')">
        <el-icon><icon-menu /></el-icon>
        <template #title>Task</template>
      </el-menu-item>
      <el-menu-item index="3" @click="router.push('/calendar')">
        <el-icon><calendar /></el-icon>
        <template #title>Calendar</template>
      </el-menu-item>
      <el-menu-item index="4">
        <el-icon><setting /></el-icon>
        <template #title>Settings</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import {
  Menu as IconMenu,
  Calendar,
  Setting,
  Trophy,
} from "@element-plus/icons-vue";
import { useRouter } from "vue-router";

const router = useRouter();
const isCollapse = ref(true);
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath);
};
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath);
};
</script>

<style lang="scss" scoped>
.app-sidebar {
  height: 100%;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .el-menu {
    width: 100%;
  }
}
</style>
