import { z } from "zod";

export const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const patchSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  is_completed: z.number().optional(),
  completed_at: z.string().optional(),
});
