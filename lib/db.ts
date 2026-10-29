import { createRequire } from "node:module";
import bcrypt from "bcryptjs";
import { runMysqlMigrations } from "@/lib/mysql-migrations";

const require = createRequire(import.meta.url);
const SyncMysql = require("sync-mysql");

function requiredEnv(name: "DB_HOST" | "DB_PORT" | "DB_USER" | "DB_PASSWORD" | "DB_NAME") {
  const value = process.env[name];
  if (value === undefined) throw new Error(`${name} is required. Copy .env.example to .env.local and configure it.`);
  return value;
}

const database = requiredEnv("DB_NAME");
const port = Number(requiredEnv("DB_PORT"));

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error("DB_NAME may contain only letters, numbers, and underscores.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT must be a valid TCP port.");
}

const connection = {
  host: requiredEnv("DB_HOST"),
  port,
  user: requiredEnv("DB_USER"),
  password: requiredEnv("DB_PASSWORD"),
};

const server = new SyncMysql(connection);
server.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
const mysql = new SyncMysql({ ...connection, database });

runMysqlMigrations(mysql);

const sqlParams = (params: unknown[]) =>
  params.map((value) => (value === undefined ? null : value));

export const db = {
  exec: (statement: string) => mysql.query(statement),
  prepare: (statement: string) => ({
    all: (...params: unknown[]) => mysql.query(statement, sqlParams(params)),
    get: (...params: unknown[]) => mysql.query(statement, sqlParams(params))[0],
    run: (...params: unknown[]) => {
      const result = mysql.query(statement, sqlParams(params));
      return { lastInsertRowid: result.insertId, changes: result.affectedRows };
    },
  }),
  transaction: <T>(work: () => T) => () => {
    mysql.query("START TRANSACTION");
    try {
      const result = work();
      mysql.query("COMMIT");
      return result;
    } catch (error) {
      mysql.query("ROLLBACK");
      throw error;
    }
  },
};

db.prepare("INSERT IGNORE INTO settings(id,business_name) VALUES(1,'Lite POS')").run();
if (!db.prepare("SELECT id FROM users WHERE email=? LIMIT 1").get("admin@gmail.com")) {
  db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(
    "Administrator",
    "admin@gmail.com",
    bcrypt.hashSync("123456", 12),
  );
}

export function nextNumber(
  table: "customers" | "sales" | "payments" | "sales_returns" | "direct_returns",
  prefix: string,
) {
  const row = db.prepare(`SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`).get() as { id?: number } | undefined;
  return `${prefix}${String((row?.id ?? 0) + 1).padStart(6, "0")}`;
}

export function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function customerBalance(customerId: number) {
  const row = db.prepare("SELECT COALESCE(SUM(debit-credit),0) balance FROM ledger_entries WHERE customer_id=?").get(customerId) as { balance: number };
  return Number(row.balance || 0);
}
