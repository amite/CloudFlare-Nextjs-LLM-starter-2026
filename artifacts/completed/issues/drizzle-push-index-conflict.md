# Issue: Drizzle Kit Push Index Conflict (SQLite)

## Description
When running `pnpm db:push`, Drizzle Kit fails with the following error:
`SqliteError: index authenticators_credentialID_unique already exists`

## Context
- **Tool:** `drizzle-kit push`
- **Database:** SQLite (Local `local.db` file)
- **Environment:** Local development

## Root Cause
The error occurs during the introspection phase of `drizzle-kit push`. Drizzle Kit compares the local TypeScript schema with the database state. In some cases, specifically with SQLite, Drizzle may attempt to recreate a unique index (like the one automatically generated for a `.unique()` column) even if it already exists in the database. 

SQLite does not support `CREATE INDEX IF NOT EXISTS` for indexes that are created implicitly via constraints or if the internal metadata state becomes slightly out of sync between Drizzle's tracking and the actual SQLite master table.

## Resolution
The most reliable resolution for local development is to reset the local database file:

1.  **Delete the local database:**
    ```bash
    rm local.db
    ```
2.  **Re-push the schema:**
    ```bash
    pnpm db:push
    ```
3.  **Re-seed data:**
    ```bash
    pnpm db:seed
    ```

## Prevention
For production or environments where data must be preserved, use the migration-based workflow instead of `push`:
1. `pnpm db:generate` to create migration files.
2. `pnpm db:migrate:local` to apply them via the migration script.

Documented on: December 25, 2024

