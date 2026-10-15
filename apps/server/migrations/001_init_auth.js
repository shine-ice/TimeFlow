exports.up = async function (knex) {
  await knex.schema.createTable("users", (t) => {
    t.string("id", 36).primary();
    t.text("email").notNullable().unique();
    t.text("name").notNullable();
    t.text("password_hash").notNullable();
    t.text("timezone").notNullable().defaultTo("UTC");
    t.dateTime("created_at").notNullable();
    t.dateTime("updated_at").notNullable();
  });

  await knex.schema.createTable("refresh_tokens", (t) => {
    t.string("id", 36).primary();
    t.string("user_id", 36).notNullable().index();
    t.text("device_id").notNullable();
    t.text("token_hash").notNullable();
    t.dateTime("expires_at").notNullable();
    t.dateTime("created_at").notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("users");
};
