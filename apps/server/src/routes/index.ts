import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { AuthController } from "../controllers/auth.controller";

export const routes = Router();

routes.post("/api/auth/register", AuthController.register);
routes.post("/api/auth/login", AuthController.login);
routes.post("/api/auth/refresh", AuthController.refresh);
routes.post("/api/auth/logout", authRequired, AuthController.logout);
