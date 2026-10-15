import { UserRow } from "../types/user.type";
import { db, unwrapInsertedId } from "../../db/knex";
import { randomUUID } from "crypto";

export const UserRepo = {
  async findByEmail(email: string) {
    return await db<UserRow>("users").where({ email }).first();
  },

  async findById(id: string) {
    return await db<UserRow>("users").where({ id }).first();
  },

  async create(data: { email: string; name: string; passwordHash: string }) {
    const id = randomUUID();

    const ret = await db<UserRow>("users").insert({
      id,
      email: data.email,
      name: data.name,
      password_hash: data.passwordHash,
      created_at: new Date().toISOString(),
    });
    return {
      id,
    };
  },

  async insert(user: any) {
    const id = randomUUID();
    user.id = id;
    const ret = await db<UserRow>("users").insert(user);
    return {
      ...user,
    };
  },
};
