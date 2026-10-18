import { z } from "zod";

const identityFields = {
  mutationId: z.string().uuid(),
  entityType: z.literal("task"),
  entityId: z.string().uuid(),
  baseVersion: z.number().int().nonnegative(),
  clientUpdatedAt: z.string().datetime().optional(),
};

const optionalTaskFields = {
  description: z.string().optional(),
  start_at: z.string().datetime({ offset: true }).nullable().optional(),
  end_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_completed: z.number().int().min(0).max(1).optional(),
  completed_at: z.string().datetime({ offset: true }).nullable().optional(),
};

const createChangeSchema = z
  .object({
    ...identityFields,
    op: z.literal("create"),
    patch: z
      .object({
        title: z.string().min(1),
        ...optionalTaskFields,
      })
      .strict(),
  })
  .strict();

const updatePatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    ...optionalTaskFields,
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Update patch must contain at least one field",
  });

const updateChangeSchema = z
  .object({
    ...identityFields,
    op: z.literal("update"),
    patch: updatePatchSchema,
  })
  .strict();

const deleteChangeSchema = z
  .object({
    ...identityFields,
    op: z.literal("delete"),
  })
  .strict();

export const pushSchema = z
  .object({
    changes: z
      .array(
        z.discriminatedUnion("op", [
          createChangeSchema,
          updateChangeSchema,
          deleteChangeSchema,
        ]),
      )
      .min(1)
      .max(500),
  })
  .strict();

export const pullSchema = z
  .object({
    sinceVersion: z.number().int().nonnegative(),
    pageSize: z.number().int().min(1).max(500).default(200),
  })
  .strict();
