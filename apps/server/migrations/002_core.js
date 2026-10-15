exports.up = async function (knex) {
  await knex.schema.createTable("tasks", (t) => {
    t.string("id", 36).primary();
    t.string("user_id", 36).notNullable().index();
    t.text("title").notNullable();
    t.text("description").notNullable();
    t.dateTime("start_at").nullable();
    t.dateTime("end_at").nullable();
    t.integer("is_completed").notNullable().defaultTo(0);
    t.dateTime("completed_at").nullable();
    t.dateTime("created_at").notNullable();
    t.dateTime("updated_at").notNullable();
    t.dateTime("deleted_at").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("tasks");
};
