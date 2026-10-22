# Lite POS

A lightweight customer-ledger POS built with Next.js, React, Tailwind CSS, and SQLite. Products are created automatically during a sale, so there is no product setup, purchase, warehouse, or stock module.

## Requirements

- Node.js 20 or newer
- npm

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Default login:

- Email: `admin@litepos.local`
- Password: `admin123`

Change `AUTH_SECRET` and the administrator password before production use.

## Database

The SQLite database is created automatically at `database/lite-pos.sqlite`. It is intentionally excluded from Git. Set `DATABASE_PATH` to use a different location.

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

The application uses SQLite WAL mode and database transactions for financial operations.
