import { z } from "zod";

export const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const patchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    start_at: z.string().datetime({ offset: true }).nullable().optional(),
    end_at: z.string().datetime({ offset: true }).nullable().optional(),
    is_completed: z.number().int().min(0).max(1).optional(),
    completed_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Patch must contain at least one field",
  });
