import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: resolve(__dirname, "dist/main"),
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "index.js",
        },
      },
    },
  },

  preload: {
    build: {
      outDir: resolve(__dirname, "dist/preload"),
      rollupOptions: {
        input: resolve(__dirname, "src/preload/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "index.js",
        },
      },
    },
  },
});
