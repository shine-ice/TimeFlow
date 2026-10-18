import { z } from "zod";

export const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
}).strict();

export const patchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    startAt: z.string().datetime({ offset: true }).nullable().optional(),
    endAt: z.string().datetime({ offset: true }).nullable().optional(),
    isCompleted: z.number().int().min(0).max(1).optional(),
    completedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Patch must contain at least one field",
  });
