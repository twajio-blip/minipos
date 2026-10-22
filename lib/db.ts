import { createRequire } from "node:module";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const SyncMysql = require("sync-mysql");
const mysql = new SyncMysql({
  host: "103.29.180.101",
  port: 3306,
  user: "datadssc_datadssc_lightpos",
  password: "datadssc_lightpos",
  database: "datadssc_lightpos",
});
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const sql = (value: string) => value.replace(/INSERT OR IGNORE/gi, "INSERT IGNORE").replace(/ COLLATE NOCASE/gi, "");
export const db = {
  pragma: (statement: string) => void statement,
  exec: (statement: string) => {
    if (/^\s*(CREATE TABLE|CREATE INDEX|INSERT OR IGNORE|UPDATE customers|ALTER TABLE)/i.test(statement)) return;
    return mysql.query(sql(statement));
  },
  prepare: (statement: string) => ({
    all: (...params: unknown[]) => {
      const match = statement.match(/^PRAGMA table_info\(([^)]+)\)/i);
      if (match) return mysql.query(`SHOW COLUMNS FROM \`${match[1]}\``).map((x: { Field: string }) => ({ name: x.Field }));
      return mysql.query(sql(statement), params);
    },
    get: (...params: unknown[]) => mysql.query(sql(statement), params)[0],
    run: (...params: unknown[]) => {
      const result = mysql.query(sql(statement), params);
      return { lastInsertRowid: result.insertId, changes: result.affectedRows };
    },
  }),
  transaction: <T>(work: () => T) => () => {
    mysql.query("START TRANSACTION");
    try { const result = work(); mysql.query("COMMIT"); return result; }
    catch (error) { mysql.query("ROLLBACK"); throw error; }
  },
};

if (!isProductionBuild) {
db.pragma("busy_timeout = 15000");
try {
  db.pragma("journal_mode = WAL");
} catch {
  /* another build worker may be initializing it */
}
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'Lite POS', logo TEXT, address TEXT, phone TEXT, email TEXT,
  invoice_footer TEXT, currency TEXT NOT NULL DEFAULT '৳', decimal_places INTEGER NOT NULL DEFAULT 2,
  invoice_format TEXT NOT NULL DEFAULT 'thermal', thermal_width TEXT NOT NULL DEFAULT '80mm', date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy', language TEXT NOT NULL DEFAULT 'en', numeral_system TEXT NOT NULL DEFAULT 'en', invoice_language TEXT NOT NULL DEFAULT 'en'
);
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS villages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(area_id, name),
  FOREIGN KEY(area_id) REFERENCES zones(id)
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  phone TEXT, email TEXT, address TEXT, proprietor TEXT, nid TEXT, bin TEXT, plant TEXT, industry TEXT,
  zone TEXT, area TEXT, customer_type TEXT, invoice_type TEXT, credit_limit NUMERIC NOT NULL DEFAULT 0,
  credit_time_limit INTEGER, cash_time_limit INTEGER, status TEXT NOT NULL DEFAULT 'active', notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE TABLE IF NOT EXISTS customer_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, name TEXT NOT NULL, designation TEXT, department TEXT, phone TEXT, email TEXT,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS customer_branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, branch_name TEXT NOT NULL, branch_code TEXT, contact_person TEXT, phone TEXT, email TEXT, address TEXT, status TEXT DEFAULT 'active',
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, normalized_name TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0, last_used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_normalized ON products(normalized_name);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT NOT NULL UNIQUE, sale_date TEXT NOT NULL,
  customer_id INTEGER, buyer_name TEXT, buyer_phone TEXT, subtotal NUMERIC NOT NULL, line_discount NUMERIC NOT NULL DEFAULT 0,
  invoice_discount NUMERIC NOT NULL DEFAULT 0, grand_total NUMERIC NOT NULL, paid_amount NUMERIC NOT NULL DEFAULT 0,
  due_amount NUMERIC NOT NULL DEFAULT 0, payment_method TEXT NOT NULL DEFAULT 'cash', notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', cancellation_reason TEXT, created_by INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id), FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL, quantity NUMERIC NOT NULL, unit_price NUMERIC NOT NULL, discount NUMERIC NOT NULL DEFAULT 0, total NUMERIC NOT NULL,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE, FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_no TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL, payment_date TEXT NOT NULL,
  amount NUMERIC NOT NULL, reference TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'active', cancellation_reason TEXT,
  created_by INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id), FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE TABLE IF NOT EXISTS sales_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, return_no TEXT NOT NULL UNIQUE, sale_id INTEGER NOT NULL, customer_id INTEGER,
  return_date TEXT NOT NULL, total NUMERIC NOT NULL, settlement TEXT NOT NULL DEFAULT 'balance', reason TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', cancellation_reason TEXT, created_by INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sale_id) REFERENCES sales(id), FOREIGN KEY(customer_id) REFERENCES customers(id), FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS sales_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, return_id INTEGER NOT NULL, sale_item_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
  quantity NUMERIC NOT NULL, unit_price NUMERIC NOT NULL, total NUMERIC NOT NULL,
  FOREIGN KEY(return_id) REFERENCES sales_returns(id) ON DELETE CASCADE, FOREIGN KEY(sale_item_id) REFERENCES sale_items(id), FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS direct_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, return_no TEXT NOT NULL UNIQUE, customer_id INTEGER,
  return_date TEXT NOT NULL, total NUMERIC NOT NULL, reason TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', cancellation_reason TEXT, created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id), FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_direct_returns_date ON direct_returns(return_date);
CREATE TABLE IF NOT EXISTS direct_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, direct_return_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL, quantity NUMERIC NOT NULL, unit_price NUMERIC NOT NULL, total NUMERIC NOT NULL,
  FOREIGN KEY(direct_return_id) REFERENCES direct_returns(id) ON DELETE CASCADE, FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, txn_date TEXT NOT NULL, type TEXT NOT NULL,
  reference_type TEXT NOT NULL, reference_id INTEGER NOT NULL, reference_no TEXT NOT NULL, description TEXT,
  debit NUMERIC NOT NULL DEFAULT 0, credit NUMERIC NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_ledger_customer_date ON ledger_entries(customer_id, txn_date, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_entries(reference_type, reference_id, type);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL,
  old_values TEXT, new_values TEXT, reason TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const customerColumns = db.prepare("PRAGMA table_info(customers)").all() as {
  name: string;
}[];
const settingColumns = db.prepare("PRAGMA table_info(settings)").all() as { name: string }[];
if (!settingColumns.some((column) => column.name === "language")) {
  db.exec("ALTER TABLE settings ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
}
if (!settingColumns.some((column) => column.name === "numeral_system")) {
  db.exec("ALTER TABLE settings ADD COLUMN numeral_system TEXT NOT NULL DEFAULT 'en'");
}
if (!settingColumns.some((column) => column.name === "invoice_language")) {
  db.exec("ALTER TABLE settings ADD COLUMN invoice_language TEXT NOT NULL DEFAULT 'en'");
}
if (!customerColumns.some((column) => column.name === "zone_id")) {
  db.exec(
    "ALTER TABLE customers ADD COLUMN zone_id INTEGER REFERENCES zones(id)",
  );
}
if (!customerColumns.some((column) => column.name === "village_id")) {
  db.exec(
    "ALTER TABLE customers ADD COLUMN village_id INTEGER REFERENCES villages(id)",
  );
}
db.exec(`
  INSERT OR IGNORE INTO zones(name)
  SELECT DISTINCT TRIM(zone) FROM customers
  WHERE TRIM(COALESCE(zone, '')) <> '';
  UPDATE customers
  SET zone_id = (SELECT id FROM zones WHERE name = TRIM(customers.zone) COLLATE NOCASE)
  WHERE zone_id IS NULL AND TRIM(COALESCE(zone, '')) <> '';
  CREATE INDEX IF NOT EXISTS idx_customers_zone ON customers(zone_id);
  INSERT OR IGNORE INTO villages(area_id, name)
  SELECT DISTINCT zone_id, TRIM(area) FROM customers
  WHERE zone_id IS NOT NULL AND TRIM(COALESCE(area, '')) <> '';
  UPDATE customers
  SET village_id = (SELECT id FROM villages WHERE area_id=customers.zone_id AND name=TRIM(customers.area) COLLATE NOCASE)
  WHERE village_id IS NULL AND zone_id IS NOT NULL AND TRIM(COALESCE(area, '')) <> '';
  CREATE INDEX IF NOT EXISTS idx_villages_area ON villages(area_id);
  CREATE INDEX IF NOT EXISTS idx_customers_village ON customers(village_id);
`);

db.prepare(
  "INSERT OR IGNORE INTO settings(id, business_name) VALUES(1, 'Lite POS')",
).run();
db.prepare(
  "INSERT OR IGNORE INTO users(name,email,password) VALUES(?,?,?)",
).run("Administrator", "admin@litepos.local", bcrypt.hashSync("admin123", 12));
}

export function nextNumber(
  table:
    "customers" | "sales" | "payments" | "sales_returns" | "direct_returns",
  prefix: string,
) {
  const row = db
    .prepare(`SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`)
    .get() as { id?: number } | undefined;
  return `${prefix}${String((row?.id ?? 0) + 1).padStart(6, "0")}`;
}

export function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function customerBalance(customerId: number) {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(debit-credit),0) balance FROM ledger_entries WHERE customer_id=?",
    )
    .get(customerId) as { balance: number };
  return Number(row.balance || 0);
}
