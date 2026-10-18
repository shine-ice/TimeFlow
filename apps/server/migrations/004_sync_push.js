const { randomUUID } = require("node:crypto");

const BACKFILL_DEVICE_ID = "migration-004";

exports.up = async function (knex) {
  const duplicateVersion = await knex("sync_changes")
    .select("user_id", "version")
    .count({ count: "*" })
    .groupBy("user_id", "version")
    .havingRaw("COUNT(*) > 1")
    .first();
  if (duplicateVersion) {
    throw new Error(
      `Cannot enforce sync version uniqueness: user ${duplicateVersion.user_id} has duplicate version ${duplicateVersion.version}`,
    );
  }

  await knex.schema.alterTable("tasks", (table) => {
    table.integer("sync_version").notNullable().defaultTo(0);
  });

  await knex.schema.alterTable("sync_changes", (table) => {
    table.string("device_id", 128).nullable();
    table.string("mutation_id", 64).nullable();
  });

  const taskUsers = await knex("tasks").distinct("user_id");
  const changeUsers = await knex("sync_changes").distinct("user_id");
  const counterUsers = await knex("sync_user_versions").distinct("user_id");
  const userIds = new Set(
    [...taskUsers, ...changeUsers, ...counterUsers].map((row) => row.user_id),
  );

  for (const userId of userIds) {
    const maxChangeRow = await knex("sync_changes")
      .where({ user_id: userId })
      .max({ max_version: "version" })
      .first();
    const counter = await knex("sync_user_versions")
      .where({ user_id: userId })
      .first();
    let version = Math.max(
      Number(maxChangeRow?.max_version ?? 0),
      Number(counter?.last_version ?? 0),
    );

    const tasks = await knex("tasks")
      .where({ user_id: userId })
      .orderBy("id", "asc");
    for (const task of tasks) {
      version += 1;
      await knex("tasks")
        .where({ user_id: userId, id: task.id })
        .update({ sync_version: version });

      const payload = task.deleted_at
        ? null
        : { ...task, sync_version: version };
      await knex("sync_changes").insert({
        id: randomUUID(),
        user_id: userId,
        entity_type: "task",
        entity_id: task.id,
        op: task.deleted_at ? "delete" : "create",
        changed_at: new Date().toISOString(),
        version,
        payload_json: JSON.stringify(payload),
        device_id: BACKFILL_DEVICE_ID,
        mutation_id: `backfill:${task.id}`,
      });
    }

    await knex("sync_user_versions")
      .insert({
        user_id: userId,
        last_version: version,
        updated_at: new Date().toISOString(),
      })
      .onConflict("user_id")
      .merge({
        last_version: version,
        updated_at: new Date().toISOString(),
      });
  }

  await knex.schema.alterTable("sync_changes", (table) => {
    table.unique(["user_id", "version"]);
    table.unique(["user_id", "device_id", "mutation_id"]);
    table.index(["user_id", "entity_id", "version"]);
  });
};

exports.down = async function (knex) {
  await knex("sync_changes")
    .where({ device_id: BACKFILL_DEVICE_ID })
    .where("mutation_id", "like", "backfill:%")
    .delete();

  await knex.schema.alterTable("sync_changes", (table) => {
    table.dropIndex(["user_id", "entity_id", "version"]);
    table.dropUnique(["user_id", "device_id", "mutation_id"]);
    table.dropUnique(["user_id", "version"]);
    table.dropColumn("mutation_id");
    table.dropColumn("device_id");
  });

  await knex.schema.alterTable("tasks", (table) => {
    table.dropColumn("sync_version");
  });
};
