import { z } from "zod";
import { syncEntityTypes } from "../types/sync.type";

const baseIdentityFields = {
  mutationId: z.string().uuid(),
  entityId: z.string().uuid(),
  baseVersion: z.number().int().nonnegative(),
  clientUpdatedAt: z.string().datetime().optional(),
};

const taskIdentityFields = {
  ...baseIdentityFields,
  entityType: z.literal("task"),
};

const optionalTaskFields = {
  description: z.string().optional(),
  startAt: z.string().datetime({ offset: true }).nullable().optional(),
  endAt: z.string().datetime({ offset: true }).nullable().optional(),
  isCompleted: z.number().int().min(0).max(1).optional(),
  completedAt: z.string().datetime({ offset: true }).nullable().optional(),
};

const createChangeSchema = z
  .object({
    ...taskIdentityFields,
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
    ...taskIdentityFields,
    op: z.literal("update"),
    patch: updatePatchSchema,
  })
  .strict();

const deleteChangeSchema = z
  .object({
    ...taskIdentityFields,
    op: z.literal("delete"),
  })
  .strict();

const reservedEntityTypes = syncEntityTypes.filter(
  (entityType) => entityType !== "task",
) as ["list", "habit", "tag"];

const reservedIdentityFields = {
  ...baseIdentityFields,
  entityType: z.enum(reservedEntityTypes),
};

const reservedPatchSchema = z
  .record(z.string(), z.unknown())
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "Patch must contain at least one field",
  });

const reservedChangeSchema = z.discriminatedUnion("op", [
  z
    .object({
      ...reservedIdentityFields,
      op: z.literal("create"),
      patch: reservedPatchSchema,
    })
    .strict(),
  z
    .object({
      ...reservedIdentityFields,
      op: z.literal("update"),
      patch: reservedPatchSchema,
    })
    .strict(),
  z
    .object({
      ...reservedIdentityFields,
      op: z.literal("delete"),
    })
    .strict(),
]);

const taskChangeSchema = z.discriminatedUnion("op", [
  createChangeSchema,
  updateChangeSchema,
  deleteChangeSchema,
]);

export const pushSchema = z
  .object({
    changes: z
      .array(z.union([taskChangeSchema, reservedChangeSchema]))
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
