import { app, BrowserWindow } from "electron";
import { join } from "node:path";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = win;

  win.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(join(process.resourcesPath, "web/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
