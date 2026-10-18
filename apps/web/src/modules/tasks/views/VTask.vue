<script setup lang="ts">
import type {
  AllowDropType,
  NodeDropType,
  RenderContentContext,
} from "element-plus";
import CTaskPanel from "@/modules/tasks/components/CTaskPanel.vue";
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
</script>

<template>
  <div class="task-view">
    <el-splitter>
      <el-splitter-panel size="30%">
        <!-- 智能清单 -->
        <el-menu>
          <el-menu-item index="1">今天</el-menu-item>
          <el-menu-item index="2">最近7天</el-menu-item>
          <el-menu-item index="3">收集箱</el-menu-item>
        </el-menu>

        <el-divider />
        <!-- 任务清单 -->
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
        <el-divider />
        <!-- 状态清单 -->
        <el-menu>
          <el-menu-item index="1">已完成</el-menu-item>
          <el-menu-item index="2">已放弃</el-menu-item>
          <el-menu-item index="3">回收站</el-menu-item>
        </el-menu>
        <el-divider />
        <!-- 状态清单 -->
        <el-menu>
          <el-menu-item index="1">已完成</el-menu-item>
          <el-menu-item index="2">已放弃</el-menu-item>
          <el-menu-item index="3">回收站</el-menu-item>
        </el-menu>
        <el-divider />
        <!-- 状态清单 -->
        <el-menu>
          <el-menu-item index="1">已完成</el-menu-item>
          <el-menu-item index="2">已放弃</el-menu-item>
          <el-menu-item index="3">回收站</el-menu-item>
        </el-menu>
      </el-splitter-panel>
      <el-splitter-panel :min="200">
        <CTaskPanel />
      </el-splitter-panel>
      <el-splitter-panel :min="200">
        <div class="demo-panel">3</div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<style lang="scss" scoped>
.task-view {
  height: 100%;
  min-height: 0;

  :deep(.el-splitter) {
    height: 100%;
    min-height: 0;
    overflow: hidden;

    .el-splitter-panel {
      height: 100%;
      min-height: 0;
      overflow-y: auto;
    }
  }
}
</style>
