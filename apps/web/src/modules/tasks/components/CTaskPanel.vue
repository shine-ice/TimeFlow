<script setup lang="ts">
import { ref, reactive } from "vue";
import type {
  AllowDropType,
  NodeDropType,
  RenderContentContext,
} from "element-plus";
import { Plus, More } from "@element-plus/icons-vue";
type Node = RenderContentContext["node"];

const handleDragStart = (node: Node, ev: DragEvent) => {
  console.log("drag start", node);
};
const handleDragEnter = (draggingNode: Node, dropNode: Node, ev: DragEvent) => {
  console.log("tree drag enter:", dropNode.label);
};
const handleDragLeave = (draggingNode: Node, dropNode: Node, ev: DragEvent) => {
  console.log("tree drag leave:", dropNode.label);
};
const handleDragOver = (draggingNode: Node, dropNode: Node, ev: DragEvent) => {
  console.log("tree drag over:", dropNode.label);
};
const handleDragEnd = (
  draggingNode: Node,
  dropNode: Node | null,
  dropType: NodeDropType,
  ev: DragEvent,
) => {
  console.log("tree drag end:", dropNode && dropNode.label, dropType);
};
const handleDrop = (
  draggingNode: Node,
  dropNode: Node,
  dropType: Exclude<NodeDropType, "none">,
  ev: DragEvent,
) => {
  console.log("tree drop:", dropNode.label, dropType);
};
const allowDrop = (draggingNode: Node, dropNode: Node, type: AllowDropType) => {
  if (dropNode.data.label === "Level two 3-1") {
    return type !== "inner";
  } else {
    return true;
  }
};
const allowDrag = (draggingNode: Node) => {
  return !draggingNode.data.label.includes("Level three 3-1-1");
};
const data = [
  {
    label: "Level one 1",
    children: [
      {
        label: "Level two 1-1",
        children: [
          {
            label: "Level three 1-1-1",
          },
        ],
      },
    ],
  },
  {
    label: "Level one 2",
    children: [
      {
        label: "Level two 2-1",
        children: [
          {
            label: "Level three 2-1-1",
          },
        ],
      },
      {
        label: "Level two 2-2",
        children: [
          {
            label: "Level three 2-2-1",
          },
        ],
      },
    ],
  },
  {
    label: "Level one 3",
    children: [
      {
        label: "Level two 3-1",
        children: [
          {
            label: "Level three 3-1-1",
          },
        ],
      },
      {
        label: "Level two 3-2",
        children: [
          {
            label: "Level three 3-2-1",
          },
        ],
      },
    ],
  },
];

const props = defineProps({
  title: {
    type: String,
    default: "任务",
  },
});
</script>

<template>
  <div class="task-panel">
    <!-- 顶部 -->
    <div class="task-panel-header">
      <el-icon><Plus /></el-icon>
      <div class="task-panel-title">
        {{ props.title }}
      </div>
      <el-icon><More /></el-icon>
      <el-icon><More /></el-icon>
    </div>
    <!-- 搜索添加 -->
    <div class="task-panel-search-add">
      <el-input placeholder="搜索任务">
        <template #prepend>
          <el-icon><Plus /></el-icon>
        </template>
        <template #append>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>
    <!-- 任务列表 -->
    <div class="task-panel-list">
      <el-tree
        style="max-width: 600px"
        :allow-drop="allowDrop"
        :allow-drag="allowDrag"
        :data="data"
        draggable
        default-expand-all
        node-key="id"
        @node-drag-start="handleDragStart"
        @node-drag-enter="handleDragEnter"
        @node-drag-leave="handleDragLeave"
        @node-drag-over="handleDragOver"
        @node-drag-end="handleDragEnd"
        @node-drop="handleDrop"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.task-panel {
  height: 100%;
  width: 100%;
  padding: 0 12px;

  .task-panel-header {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 12px;
    margin-bottom: 12px;

    background: var(--color-surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);

    .task-panel-title {
      flex: 1;
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text);
    }
  }

  .task-panel-search-add {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0 12px;
    margin-bottom: 12px;

    background: var(--color-surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
}
</style>
