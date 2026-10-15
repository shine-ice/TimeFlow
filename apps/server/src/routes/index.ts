import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { AuthController } from "../controllers/auth.controller";
import { TaskController } from "../controllers/task.controller";

export const routes = Router();

routes.post("/api/auth/register", AuthController.register);
routes.post("/api/auth/login", AuthController.login);
routes.post("/api/auth/refresh", AuthController.refresh);
routes.post("/api/auth/logout", authRequired, AuthController.logout);

routes.get("/api/tasks", authRequired, TaskController.page);
routes.get("/api/tasks/:id", authRequired, TaskController.getById);
routes.post("/api/tasks", authRequired, TaskController.insert);
routes.patch("/api/tasks/:id", authRequired, TaskController.patch);
routes.delete("/api/tasks/:id", authRequired, TaskController.remove);
