# Lite POS

A lightweight customer-ledger POS built with Next.js, React, Tailwind CSS, and MySQL/MariaDB. Products are created automatically during a sale, so there is no product setup, purchase, warehouse, or stock module.

## Requirements

- Node.js 20 or newer
- npm
- MySQL 8+ or MariaDB 10.4+

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Default login:

- Email: `admin@gmail.com`
- Password: `123456`

Change `AUTH_SECRET` and the administrator password before production use.

## Database

Copy `.env.example` to `.env.local` and adjust the MySQL credentials if needed. The configured database, tables, indexes, and seed records are created automatically at startup. Applied schema versions are recorded in `schema_migrations`.

## Features

- Authenticated single-user application
- Customer setup with due or advance opening balances
- Registered-customer and walk-in sales
- Multiple products per invoice
- Automatic product creation with case-insensitive suggestions
- Partial payment and customer due accounting
- Customer payments and advance balances
- Full or partial sales returns
- Balance adjustment or cash-refund returns
- Invoice, payment, and return cancellation with audit reasons
- Chronological customer ledger with running balance
- Dashboard and product/date-wise reports
- CSV export and print-friendly invoices, ledgers, and reports
- Business and receipt-format settings

## Verification

```bash
npm run lint
npm run build
npm start
```

The application uses InnoDB and database transactions for financial operations.
