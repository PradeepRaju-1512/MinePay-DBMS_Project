-- MinePay: Destructive Database Reset & Re-seed
-- DO NOT RUN during normal application startup

DROP TABLE IF EXISTS sql_audit_logs CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

\i schema.sql
