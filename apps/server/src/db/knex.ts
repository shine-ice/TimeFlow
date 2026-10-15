import knex, { Knex } from "knex";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const serverRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(serverRoot, ".env") });

const client = (process.env.DB_CLIENT || "sqlite3").toLowerCase();
const isMySQL = client === "mysql2" || client === "mysql";
const isTest = process.env.NODE_ENV === "test";
const sqliteFile =
  process.env.SQLITE_FILE || process.env.SQLITE_PATH || "./db/dev.sqlite3";
const sqlitePath = path.resolve(serverRoot, sqliteFile);

if (!isMySQL) {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
}

const config: Knex.Config = {
  client: isMySQL ? "mysql2" : "sqlite3",
  connection: isMySQL
    ? {
        host: process.env.DB_HOST || process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
        user: process.env.DB_USER || process.env.MYSQL_USER || "root",
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
        database:
          process.env.DB_NAME || process.env.MYSQL_DATABASE || "timeflow",
      }
    : {
        filename: sqlitePath,
      },
  useNullAsDefault: !isMySQL,
  pool: {
    min: 0,
    max: isTest ? 5 : 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
};

export const db = knex(config);

export function unwrapInsertedId(ret: any): number {
  if (Array.isArray(ret) && typeof ret[0] === "number") return ret[0];
  if (Array.isArray(ret) && ret[0]?.insertId) return Number(ret[0].insertId);
  if (ret?.insertId) return Number(ret.insertId);
  return Number(ret);
}
