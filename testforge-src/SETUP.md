# TestForge — Setup Guide

A TestRail-style test case management app (full-stack: Node/Express/Prisma backend + React frontend). This guide gets it running from a zipped copy of the project.

## 1. Prerequisites

Install these first if you don't have them:
- **Node.js v20 or later** — https://nodejs.org (npm comes bundled with it)
- **PostgreSQL** — a local PostgreSQL server for development and testing, or a hosted PostgreSQL database. This guide is for the Web App version; the separate desktop app uses SQLite.

## 2. Unzip and open a terminal

Extract the zip anywhere, then open a terminal (PowerShell on Windows, Terminal on Mac/Linux) **in the project's root folder** (the one containing `package.json`, `server/`, and `client/`).

## 3. Clean out anything platform-specific

If the zip included a `node_modules` folder (it shouldn't, but check), delete it before continuing — it contains compiled binaries specific to the machine it was zipped on and will not work on a different computer:

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force node_modules, server\node_modules, client\node_modules -ErrorAction SilentlyContinue
```
```bash
# Mac/Linux
rm -rf node_modules server/node_modules client/node_modules
```

Database contents live in the PostgreSQL database identified by `DATABASE_URL`, not in a `dev.db` file. To start fresh, create a new empty local database (or clear the existing one only if you intend to delete its data).

## 4. Install dependencies

From the project root:
```powershell
npm install
```
This installs both the `server` and `client` workspaces (it's an npm-workspaces monorepo, one install covers both) and downloads the correct native Prisma binary for **this** machine.

## 5. Set up environment files

Check whether `server/.env` and `client/.env` already exist (the zip may have included them). If they're **missing**, create them:

```powershell
cd server
copy ..\.env.example .env
cd ..\client
```
Create `client/.env` with:
```
VITE_API_BASE_URL="http://localhost:4000/api/v1"
```

Set `DATABASE_URL` in `server/.env` to your PostgreSQL connection string. For example, if PostgreSQL is running locally with a database named `testforge` and user `postgres`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/testforge?schema=public"
TEST_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/testforge_test?schema=public"
```
Create both the `testforge` and `testforge_test` databases first. The test database must be disposable and separate from development or production data. Keep real credentials in local environment files; do not commit them. Other development defaults in `.env.example` are placeholders, not production secrets.

Firebase signs the user in and verifies the email; PostgreSQL is the source of truth for TestForge users, roles, and active status. A verified Firebase account must already have a matching PostgreSQL user row; unknown identities cannot self-register. To bootstrap or promote an admin from a trusted server/developer shell, run from `testforge-src`:

```powershell
npm.cmd run firebase:bootstrap-admin --workspace=server -- --email you@example.com --confirm
```

This creates or promotes that email's PostgreSQL user row to `ADMIN`. The command requires direct access to the server's configured PostgreSQL database; it does not expose a public admin-creation endpoint. Existing Firebase logins then use the database role. Do not run it against a hosted database unless you intend to grant that account admin access there.

## 6. Set up the database

From the project root:
```powershell
cd server
npx prisma migrate dev
npx tsx prisma/seed.ts
cd ..
```
- `prisma migrate dev` applies the PostgreSQL migration history to the database selected by `DATABASE_URL`.
- The desktop app's old SQLite migration files are preserved under `server/prisma/migrations-sqlite-legacy/` for reference; they are not used by this Web App.
- `prisma/seed.ts` seeds 4 demo users and a populated "Online Banking" demo project — it's safe to re-run; it skips seeding if that data already exists.

## 7. Run it

From the project root:
```powershell
npm run dev
```
Run this from the Web App source root (`Portfolio/testforge-src`), which is the folder containing the root `package.json`. On Windows PowerShell, use `npm.cmd run dev` if PowerShell blocks the `npm.ps1` wrapper. This starts both the API server (port 4000) and the Web App (port 5173); it does not start the separate desktop app. Once both report ready, open:

**http://localhost:5173/testforge/**

Log in with any of these seeded accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@testforge.local` | `ChangeMe123!` |
| Lead | `lead@testforge.local` | `LeadPass123!` |
| Tester | `tester@testforge.local` | `TesterPass123!` |
| Viewer | `viewer@testforge.local` | `ViewerPass123!` |

API docs (Swagger UI): http://localhost:4000/api/v1/docs

## Troubleshooting

**`Error: listen EADDRINUSE: address already in use :::4000`**
Something else is already using port 4000 or 5173 — most likely a previous `npm run dev` still running in another terminal window that was never stopped. Close that terminal (or press `Ctrl+C` in it), then try again. On Windows you can also find and kill it manually:
```powershell
netstat -ano | findstr :4000
taskkill /F /PID <the PID number from the output>
```

**Prisma errors mentioning a missing engine / `.node` file / wrong platform**
This means `node_modules` (or specifically `node_modules/.prisma`) came from a different operating system or CPU architecture than the one you're running on now. Delete `node_modules` (see step 3) and re-run `npm install`.

**"table does not exist" errors**
For a fresh local development database, confirm `DATABASE_URL` points to `testforge`, then re-run `npx prisma migrate dev` from inside `server/`. Do not run `migrate dev` against the existing hosted Neon database; Render continues to sync that database with `prisma db push` because it has no migration history.

**Port 5173 says "in use, trying another one" and picks 5174 instead**
The client will still work, just at `http://localhost:5174` instead — but check `client/.env`'s `VITE_API_BASE_URL` still points at the right server port (4000), and note the *server* may have failed to start for the same reason (see the EADDRINUSE fix above) — check that terminal output too, a working client with a dead server will fail every request.

## What's included

Full feature list, architecture notes, and data model rationale are documented in `CLAUDE.md` (project root) and `server/CLAUDE.md` / `client/CLAUDE.md` — worth a read if you're going to modify the code, not just run it.
