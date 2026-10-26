# MinePay

Minecraft-themed online banking simulator built for a DBMS course project. Players own "chests" (accounts) holding emeralds and can send emeralds to each other from different devices/browsers at the same time. The point of the project is the database side: transactions, locking and a normalized schema.

Stack: PostgreSQL, Node/Express, React (Vite). There is also a plain HTML/JS version of the UI in `public/`.

## What it covers

- 3NF schema: `users`, `accounts`, `transactions`, `ledger_entries`, plus `sql_audit_logs` and `sessions` (see `schema.sql`)
- Foreign keys use `ON DELETE RESTRICT`, and `CHECK (balance >= 0)` stops overdrafts at the database level
- Transfers run in one transaction. Both accounts are locked with `SELECT ... FOR UPDATE`, always in `account_id` order, so two transfers can't deadlock each other
- Optional `idempotency_key` on a transfer so a retried request is not applied twice
- Every transfer writes a debit and a credit row to `ledger_entries`
- Sessions are stored in Postgres, so you can stay logged in from several devices
- Passwords and PINs are hashed with bcrypt

## Screens

- **Bank**: balance, your chests, send emeralds to another player, recent ledger
- **History**: full transaction list with search
- **Lab**: fires 2, 4 or 8 simultaneous debits at one chest to show row locking. The balance never goes below zero and the extra debits get rejected
- **Spec**: tables, keys and constraints
- **Lecture**: live SQL trace, table browser and short notes on ACID and normalization

## Setup (Ubuntu)

Install Postgres and Node:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib nodejs npm
sudo systemctl start postgresql
```

Create the database and load the schema:

```bash
sudo -u postgres psql -c "CREATE DATABASE minepay_db;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -d minepay_db -f schema.sql
```

Install packages and create your env file:

```bash
npm install
cp .env.example .env
```

Run it:

```bash
npm run build   # builds the React app into dist/
npm start       # http://localhost:3000
```

For development use `npm run dev`. Tests need the database above to be running:

```bash
npm test
```

`reset.sql` drops all tables and recreates them from `schema.sql`. Only run it when you want to wipe everything.

## Demo players

| Player | Chest | Starting balance | PIN | Password |
|---|---|---|---|---|
| Alex | Alex's Oak Chest | 2300 | 4321 | minecraft123 |
| Piglin | Piglin's Gold Pile | 1800 | 9999 | minecraft123 |
| Steve | Steve's Oak Chest | 1500 | 1234 | minecraft123 |
| Villager | Villager's Emerald Vault | 4000 | 0000 | minecraft123 |

## Files

```
schema.sql         tables, constraints, seed data
reset.sql          drop everything and reload schema
db.js              connection pool, auth, transfers, lab, audit log
server.js          express routes
server.ts          dev server (vite + express)
src/App.tsx        React UI
public/            plain HTML/CSS/JS version of the UI
test/run-tests.js  integration tests
```
