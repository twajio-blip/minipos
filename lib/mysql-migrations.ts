type MysqlQueryResult = Array<Record<string, unknown>> & {
  affectedRows?: number;
  insertId?: number;
};
type MysqlConnection = { query: (sql: string, params?: unknown[]) => MysqlQueryResult };
type Migration = { version: number; name: string; statements: string[] };

const migrations: Migration[] = [
  {
    version: 1,
    name: "create_initial_schema",
    statements: [
      `CREATE TABLE IF NOT EXISTS users (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(150) NOT NULL, email VARCHAR(254) NOT NULL, password VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_users_email (email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS settings (id TINYINT UNSIGNED NOT NULL, business_name VARCHAR(200) NOT NULL DEFAULT 'Lite POS', logo TEXT NULL, address TEXT NULL, phone VARCHAR(50) NULL, email VARCHAR(254) NULL, invoice_footer TEXT NULL, currency VARCHAR(20) NOT NULL DEFAULT '৳', decimal_places TINYINT UNSIGNED NOT NULL DEFAULT 2, invoice_format VARCHAR(30) NOT NULL DEFAULT 'thermal', thermal_width VARCHAR(20) NOT NULL DEFAULT '80mm', date_format VARCHAR(30) NOT NULL DEFAULT 'dd/MM/yyyy', language VARCHAR(10) NOT NULL DEFAULT 'en', numeral_system VARCHAR(10) NOT NULL DEFAULT 'en', invoice_language VARCHAR(10) NOT NULL DEFAULT 'en', PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS zones (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(191) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_zones_name (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS villages (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, area_id BIGINT UNSIGNED NOT NULL, name VARCHAR(191) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_villages_area_name (area_id,name), KEY ix_villages_area (area_id), CONSTRAINT fk_villages_area FOREIGN KEY (area_id) REFERENCES zones(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS customers (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, code VARCHAR(50) NOT NULL, name VARCHAR(191) NOT NULL, phone VARCHAR(50) NULL, email VARCHAR(254) NULL, address TEXT NULL, proprietor VARCHAR(191) NULL, nid VARCHAR(100) NULL, bin VARCHAR(100) NULL, plant VARCHAR(191) NULL, industry VARCHAR(191) NULL, zone VARCHAR(191) NULL, area VARCHAR(191) NULL, customer_type VARCHAR(50) NULL, invoice_type VARCHAR(50) NULL, credit_limit DECIMAL(18,4) NOT NULL DEFAULT 0, credit_time_limit INT NULL, cash_time_limit INT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', notes TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, zone_id BIGINT UNSIGNED NULL, village_id BIGINT UNSIGNED NULL, PRIMARY KEY (id), UNIQUE KEY ux_customers_code (code), KEY ix_customers_name (name), KEY ix_customers_phone (phone), KEY ix_customers_zone (zone_id), KEY ix_customers_village (village_id), CONSTRAINT fk_customers_zone FOREIGN KEY (zone_id) REFERENCES zones(id), CONSTRAINT fk_customers_village FOREIGN KEY (village_id) REFERENCES villages(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS customer_contacts (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, customer_id BIGINT UNSIGNED NOT NULL, name VARCHAR(191) NOT NULL, designation VARCHAR(191) NULL, department VARCHAR(191) NULL, phone VARCHAR(50) NULL, email VARCHAR(254) NULL, PRIMARY KEY (id), KEY ix_customer_contacts_customer (customer_id), CONSTRAINT fk_customer_contacts_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS customer_branches (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, customer_id BIGINT UNSIGNED NOT NULL, branch_name VARCHAR(191) NOT NULL, branch_code VARCHAR(100) NULL, contact_person VARCHAR(191) NULL, phone VARCHAR(50) NULL, email VARCHAR(254) NULL, address TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', PRIMARY KEY (id), KEY ix_customer_branches_customer (customer_id), CONSTRAINT fk_customer_branches_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS products (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(191) NOT NULL, normalized_name VARCHAR(191) NOT NULL, price DECIMAL(18,4) NOT NULL DEFAULT 0, use_count BIGINT UNSIGNED NOT NULL DEFAULT 0, last_used_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY ix_products_normalized (normalized_name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sales (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, invoice_no VARCHAR(50) NOT NULL, sale_date DATE NOT NULL, customer_id BIGINT UNSIGNED NULL, buyer_name VARCHAR(191) NULL, buyer_phone VARCHAR(50) NULL, subtotal DECIMAL(18,4) NOT NULL, line_discount DECIMAL(18,4) NOT NULL DEFAULT 0, invoice_discount DECIMAL(18,4) NOT NULL DEFAULT 0, grand_total DECIMAL(18,4) NOT NULL, paid_amount DECIMAL(18,4) NOT NULL DEFAULT 0, due_amount DECIMAL(18,4) NOT NULL DEFAULT 0, payment_method VARCHAR(30) NOT NULL DEFAULT 'cash', notes TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', cancellation_reason TEXT NULL, created_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_sales_invoice_no (invoice_no), KEY ix_sales_date (sale_date), KEY ix_sales_customer (customer_id), CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id), CONSTRAINT fk_sales_user FOREIGN KEY (created_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sale_items (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, sale_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, product_name VARCHAR(191) NOT NULL, quantity DECIMAL(18,4) NOT NULL, unit_price DECIMAL(18,4) NOT NULL, discount DECIMAL(18,4) NOT NULL DEFAULT 0, total DECIMAL(18,4) NOT NULL, PRIMARY KEY (id), KEY ix_sale_items_sale (sale_id), KEY ix_sale_items_product (product_id), CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE, CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, receipt_no VARCHAR(50) NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, payment_date DATE NOT NULL, amount DECIMAL(18,4) NOT NULL, reference VARCHAR(191) NULL, notes TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', cancellation_reason TEXT NULL, created_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_payments_receipt_no (receipt_no), KEY ix_payments_date (payment_date), KEY ix_payments_customer (customer_id), CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id), CONSTRAINT fk_payments_user FOREIGN KEY (created_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sales_returns (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, return_no VARCHAR(50) NOT NULL, sale_id BIGINT UNSIGNED NOT NULL, customer_id BIGINT UNSIGNED NULL, return_date DATE NOT NULL, total DECIMAL(18,4) NOT NULL, settlement VARCHAR(30) NOT NULL DEFAULT 'balance', reason TEXT NULL, notes TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', cancellation_reason TEXT NULL, created_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_sales_returns_return_no (return_no), KEY ix_sales_returns_sale (sale_id), KEY ix_sales_returns_customer (customer_id), KEY ix_sales_returns_date (return_date), CONSTRAINT fk_sales_returns_sale FOREIGN KEY (sale_id) REFERENCES sales(id), CONSTRAINT fk_sales_returns_customer FOREIGN KEY (customer_id) REFERENCES customers(id), CONSTRAINT fk_sales_returns_user FOREIGN KEY (created_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sales_return_items (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, return_id BIGINT UNSIGNED NOT NULL, sale_item_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, quantity DECIMAL(18,4) NOT NULL, unit_price DECIMAL(18,4) NOT NULL, total DECIMAL(18,4) NOT NULL, PRIMARY KEY (id), KEY ix_sales_return_items_return (return_id), KEY ix_sales_return_items_sale_item (sale_item_id), KEY ix_sales_return_items_product (product_id), CONSTRAINT fk_sales_return_items_return FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE, CONSTRAINT fk_sales_return_items_sale_item FOREIGN KEY (sale_item_id) REFERENCES sale_items(id), CONSTRAINT fk_sales_return_items_product FOREIGN KEY (product_id) REFERENCES products(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS direct_returns (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, return_no VARCHAR(50) NOT NULL, customer_id BIGINT UNSIGNED NULL, return_date DATE NOT NULL, total DECIMAL(18,4) NOT NULL, reason TEXT NULL, notes TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', cancellation_reason TEXT NULL, created_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY ux_direct_returns_return_no (return_no), KEY ix_direct_returns_date (return_date), KEY ix_direct_returns_customer (customer_id), CONSTRAINT fk_direct_returns_customer FOREIGN KEY (customer_id) REFERENCES customers(id), CONSTRAINT fk_direct_returns_user FOREIGN KEY (created_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS direct_return_items (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, direct_return_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, product_name VARCHAR(191) NOT NULL, quantity DECIMAL(18,4) NOT NULL, unit_price DECIMAL(18,4) NOT NULL, total DECIMAL(18,4) NOT NULL, PRIMARY KEY (id), KEY ix_direct_return_items_return (direct_return_id), KEY ix_direct_return_items_product (product_id), CONSTRAINT fk_direct_return_items_return FOREIGN KEY (direct_return_id) REFERENCES direct_returns(id) ON DELETE CASCADE, CONSTRAINT fk_direct_return_items_product FOREIGN KEY (product_id) REFERENCES products(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS ledger_entries (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, customer_id BIGINT UNSIGNED NOT NULL, txn_date DATE NOT NULL, type VARCHAR(40) NOT NULL, reference_type VARCHAR(40) NOT NULL, reference_id BIGINT UNSIGNED NOT NULL, reference_no VARCHAR(50) NOT NULL, description TEXT NULL, debit DECIMAL(18,4) NOT NULL DEFAULT 0, credit DECIMAL(18,4) NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY ix_ledger_customer_date (customer_id,txn_date,id), UNIQUE KEY ux_ledger_reference (reference_type,reference_id,type), CONSTRAINT fk_ledger_customer FOREIGN KEY (customer_id) REFERENCES customers(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS audit_logs (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, user_id BIGINT UNSIGNED NULL, action VARCHAR(80) NOT NULL, entity_type VARCHAR(80) NOT NULL, entity_id BIGINT UNSIGNED NOT NULL, old_values LONGTEXT NULL, new_values LONGTEXT NULL, reason TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY ix_audit_logs_entity (entity_type,entity_id), KEY ix_audit_logs_user (user_id), CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    version: 2,
    name: "upgrade_legacy_schema",
    statements: [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER normalized_name",
      "ALTER TABLE settings ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en'",
      "ALTER TABLE settings ADD COLUMN IF NOT EXISTS numeral_system VARCHAR(10) NOT NULL DEFAULT 'en'",
      "ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_language VARCHAR(10) NOT NULL DEFAULT 'en'",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS zone_id BIGINT NULL",
      "ALTER TABLE customers ADD COLUMN IF NOT EXISTS village_id BIGINT NULL",
      "INSERT IGNORE INTO zones(name) SELECT DISTINCT TRIM(zone) FROM customers WHERE TRIM(COALESCE(zone,'')) <> ''",
      "UPDATE customers c JOIN zones z ON z.name=TRIM(c.zone) SET c.zone_id=z.id WHERE c.zone_id IS NULL AND TRIM(COALESCE(c.zone,'')) <> ''",
      "INSERT IGNORE INTO villages(area_id,name) SELECT DISTINCT zone_id,TRIM(area) FROM customers WHERE zone_id IS NOT NULL AND TRIM(COALESCE(area,'')) <> ''",
      "UPDATE customers c JOIN villages v ON v.area_id=c.zone_id AND v.name=TRIM(c.area) SET c.village_id=v.id WHERE c.village_id IS NULL AND TRIM(COALESCE(c.area,'')) <> ''",
      "CREATE INDEX IF NOT EXISTS ix_customers_name ON customers(name(191))",
      "CREATE INDEX IF NOT EXISTS ix_customers_phone ON customers(phone(50))",
      "CREATE INDEX IF NOT EXISTS ix_customers_zone ON customers(zone_id)",
      "CREATE INDEX IF NOT EXISTS ix_customers_village ON customers(village_id)",
      "CREATE INDEX IF NOT EXISTS ix_villages_area ON villages(area_id)",
      "CREATE INDEX IF NOT EXISTS ix_products_normalized ON products(normalized_name(191))",
      "CREATE INDEX IF NOT EXISTS ix_sales_date ON sales(sale_date(10))",
      "CREATE INDEX IF NOT EXISTS ix_sales_customer ON sales(customer_id)",
      "CREATE INDEX IF NOT EXISTS ix_payments_date ON payments(payment_date(10))",
      "CREATE INDEX IF NOT EXISTS ix_ledger_customer_date ON ledger_entries(customer_id,txn_date(10),id)",
      "CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_reference ON ledger_entries(reference_type(40),reference_id,type(40))",
      "CREATE INDEX IF NOT EXISTS ix_direct_returns_date ON direct_returns(return_date(10))",
    ],
  },
  {
    version: 3,
    name: "enforce_unique_user_emails",
    statements: [
      "UPDATE audit_logs a JOIN users duplicate_user ON a.user_id=duplicate_user.id JOIN (SELECT email,MIN(id) keep_id FROM users GROUP BY email HAVING COUNT(*)>1) duplicates ON duplicates.email=duplicate_user.email SET a.user_id=duplicates.keep_id WHERE duplicate_user.id<>duplicates.keep_id",
      "UPDATE sales s JOIN users duplicate_user ON s.created_by=duplicate_user.id JOIN (SELECT email,MIN(id) keep_id FROM users GROUP BY email HAVING COUNT(*)>1) duplicates ON duplicates.email=duplicate_user.email SET s.created_by=duplicates.keep_id WHERE duplicate_user.id<>duplicates.keep_id",
      "UPDATE payments p JOIN users duplicate_user ON p.created_by=duplicate_user.id JOIN (SELECT email,MIN(id) keep_id FROM users GROUP BY email HAVING COUNT(*)>1) duplicates ON duplicates.email=duplicate_user.email SET p.created_by=duplicates.keep_id WHERE duplicate_user.id<>duplicates.keep_id",
      "UPDATE sales_returns r JOIN users duplicate_user ON r.created_by=duplicate_user.id JOIN (SELECT email,MIN(id) keep_id FROM users GROUP BY email HAVING COUNT(*)>1) duplicates ON duplicates.email=duplicate_user.email SET r.created_by=duplicates.keep_id WHERE duplicate_user.id<>duplicates.keep_id",
      "UPDATE direct_returns r JOIN users duplicate_user ON r.created_by=duplicate_user.id JOIN (SELECT email,MIN(id) keep_id FROM users GROUP BY email HAVING COUNT(*)>1) duplicates ON duplicates.email=duplicate_user.email SET r.created_by=duplicates.keep_id WHERE duplicate_user.id<>duplicates.keep_id",
      "DELETE duplicate_user FROM users duplicate_user JOIN users keeper ON keeper.email=duplicate_user.email AND keeper.id<duplicate_user.id",
      "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(email(191))",
    ],
  },
  {
    version: 4,
    name: "repair_legacy_timestamp_defaults",
    statements: [
      "UPDATE users SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "ALTER TABLE users MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "UPDATE zones SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "UPDATE zones SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL OR TRIM(updated_at)=''",
      "ALTER TABLE zones MODIFY name VARCHAR(191) NOT NULL, MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "UPDATE villages SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "UPDATE villages SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL OR TRIM(updated_at)=''",
      "ALTER TABLE villages MODIFY name VARCHAR(191) NOT NULL, MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "UPDATE customers SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "UPDATE customers SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL OR TRIM(updated_at)=''",
      "ALTER TABLE customers MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "UPDATE sales SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "UPDATE sales SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL OR TRIM(updated_at)=''",
      "ALTER TABLE sales MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "UPDATE payments SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "ALTER TABLE payments MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "UPDATE sales_returns SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "ALTER TABLE sales_returns MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "UPDATE direct_returns SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "ALTER TABLE direct_returns MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active', MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "UPDATE ledger_entries SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "ALTER TABLE ledger_entries MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "UPDATE audit_logs SET created_at=CURRENT_TIMESTAMP WHERE created_at IS NULL OR TRIM(created_at)=''",
      "ALTER TABLE audit_logs MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE customer_branches MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active'",
    ],
  },
  {
    version: 5,
    name: "repair_legacy_customer_defaults",
    statements: [
      "ALTER TABLE customers MODIFY credit_limit DECIMAL(18,4) NOT NULL DEFAULT 0",
    ],
  },
  {
    version: 6,
    name: "repair_all_legacy_write_defaults",
    statements: [
      "ALTER TABLE settings MODIFY business_name VARCHAR(200) NOT NULL DEFAULT 'Lite POS', MODIFY currency VARCHAR(20) NOT NULL DEFAULT '৳', MODIFY decimal_places TINYINT UNSIGNED NOT NULL DEFAULT 2, MODIFY invoice_format VARCHAR(30) NOT NULL DEFAULT 'thermal', MODIFY thermal_width VARCHAR(20) NOT NULL DEFAULT '80mm', MODIFY date_format VARCHAR(30) NOT NULL DEFAULT 'dd/MM/yyyy', MODIFY language VARCHAR(10) NOT NULL DEFAULT 'en', MODIFY numeral_system VARCHAR(10) NOT NULL DEFAULT 'en', MODIFY invoice_language VARCHAR(10) NOT NULL DEFAULT 'en'",
      "ALTER TABLE products MODIFY price DECIMAL(18,4) NOT NULL DEFAULT 0, MODIFY use_count BIGINT UNSIGNED NOT NULL DEFAULT 0",
      "ALTER TABLE sales MODIFY line_discount DECIMAL(18,4) NOT NULL DEFAULT 0, MODIFY invoice_discount DECIMAL(18,4) NOT NULL DEFAULT 0, MODIFY paid_amount DECIMAL(18,4) NOT NULL DEFAULT 0, MODIFY due_amount DECIMAL(18,4) NOT NULL DEFAULT 0, MODIFY payment_method VARCHAR(30) NOT NULL DEFAULT 'cash'",
      "ALTER TABLE sale_items MODIFY discount DECIMAL(18,4) NOT NULL DEFAULT 0",
      "ALTER TABLE ledger_entries MODIFY debit DECIMAL(18,4) NOT NULL DEFAULT 0, MODIFY credit DECIMAL(18,4) NOT NULL DEFAULT 0",
    ],
  },
];

export function runMysqlMigrations(mysql: MysqlConnection) {
  mysql.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version INT UNSIGNED NOT NULL, name VARCHAR(191) NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (version)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const lock = mysql.query("SELECT GET_LOCK('lite_pos_schema_migrations',30) acquired")[0] as { acquired: number };
  if (Number(lock.acquired) !== 1) throw new Error("Could not acquire the database migration lock.");
  try {
    const applied = new Set<number>(mysql.query("SELECT version FROM schema_migrations").map((row) => Number(row.version)));
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      for (const statement of migration.statements) mysql.query(statement);
      mysql.query("INSERT INTO schema_migrations(version,name) VALUES(?,?)", [migration.version, migration.name]);
    }
  } finally {
    mysql.query("SELECT RELEASE_LOCK('lite_pos_schema_migrations')");
  }
}
