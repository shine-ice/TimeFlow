const { spawn } = require("node:child_process");
const { dirname, resolve } = require("node:path");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronViteBin = resolve(dirname(require.resolve("electron-vite")), "../bin/electron-vite.js");
const electronVite = spawn(
  process.execPath,
  [electronViteBin, "dev", "--config", "electron.vite.config.ts"],
  { env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => electronVite.kill(signal));
}

electronVite.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
