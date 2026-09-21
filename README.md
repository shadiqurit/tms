# TMS redevelopment

This repository now contains the first migration slice of the Oracle APEX TMS application:

- `apps/web` — Vue 3 + TypeScript + Vite user interface
- `apps/api` — Node.js + Express + TypeScript API
- `apps/api/migrations` — MySQL 8 schema
- `apps/api/src/scripts/import-legacy.ts` — importer for the supplied Oracle JSON exports
- `Oracle` and `Data` — the original source material, kept unchanged

## Included in this slice

- Responsive login experience
- JWT authentication and bcrypt password verification
- Collapsible role-aware menu shell
- Project dashboard based on the legacy data totals
- Project browser with dedicated create and modify forms
- Role and menu permission management screen
- Programmer super-administrator role with unrestricted access
- Reference-aware project deletion with typed confirmation and audit history
- Server-side permission middleware and user-to-project scoping
- MySQL tables for companies, users, roles, permissions, menus, projects, sites, expense types, and audit logs
- Import of the existing users, groups, menu permissions, project assignments, projects, sites, and pre-award/execution expense setup

## Run the interface

```bash
npm install
npm run dev:web
```

Open `http://localhost:5173`. Preview mode is enabled by default:

- Email: `demo@tms.local`
- Password: `demo123`

Set `VITE_DEMO_MODE=false` in `apps/web/.env.local` to use the Node API.

For development from another device on the same network, run the API and web app, then open
`http://<computer-ip>:5173`. Vite listens on the LAN and proxies `/api` to the local API process,
so only port 5173 needs to be reachable from other devices.

## Configure MySQL and the API

1. Install MySQL 8 and create an empty database and application user.
2. Copy `.env.example` to `.env` and replace all secrets.
3. Grant the application user `CREATE`, `ALTER`, `INDEX`, and `REFERENCES` while setting up a new database.
4. Run `npm run db:setup` to apply migrations, import the normalized application data, import every JSON export into a corresponding `legacy_*` table, and verify row counts.
5. Run `npm run dev` to start both the API and Vue application.

After setup, the application only needs `SELECT`, `INSERT`, `UPDATE`, and `DELETE`; the temporary DDL grants can be revoked.

The importer hashes legacy passwords with bcrypt before inserting them into MySQL. The source `Data/APPUSER.json` still contains the old plaintext values, so restrict access to the legacy export and remove it from production deployments.

## Validation

```bash
npm run typecheck
npm run build
```

See [docs/legacy-analysis.md](docs/legacy-analysis.md) for the source-system inventory and migration decisions.
