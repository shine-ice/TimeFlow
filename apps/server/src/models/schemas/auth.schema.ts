import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.email().min(1),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const LoginSchema = z.object({
  email: z.email().min(1),
  password: z.string().min(8),
  deviceId: z.string().min(1).optional(),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
