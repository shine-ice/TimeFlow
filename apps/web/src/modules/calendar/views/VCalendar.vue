<template>
  <el-calendar v-model="value" :controller-type="controllerType" />
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
const controllerType = ref<"select" | "button">("select");
const value = ref(new Date());
</script>

<style lang="scss" scoped></style>
