exports.up = async (knex) => {
  (await knex.schema.createTable("sync_changes", (t) => {
    t.string("id", 36).primary();
    t.string("user_id", 36).notNullable().index();
    t.text("entity_type").notNullable();
    t.string("entity_id", 36).notNullable();
    t.text("op").notNullable();
    t.dateTime("changed_at").notNullable();
    t.integer("version").notNullable().index();
    t.text("payload_json").notNullable();
  }),
    await knex.schema.createTable("sync_user_versions", (t) => {
      t.string("user_id", 36).primary();
      t.integer("last_version").notNullable().defaultTo(0);
      t.dateTime("updated_at").notNullable();
    }));
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("sync_changes");
  await knex.schema.dropTableIfExists("sync_user_versions");
};
