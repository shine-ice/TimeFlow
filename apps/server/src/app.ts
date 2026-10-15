import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { errorMiddleware } from "./middleware/error";
import { ok } from "./utils/errors";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json(ok({ ok: true })));

  app.use(routes);
  app.use(errorMiddleware);

  return app;
}

export const app = createApp();
