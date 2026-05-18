# THE PLACE — Gym CRM

Internal management dashboard for THE PLACE (Phnom Penh) — members, staff, appointments, roster, packages, reports, meal/workout planner.

Built on Next.js 15 (App Router) + React 19 + Tailwind + Shadcn UI + MongoDB.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Set env vars
cp .env.example .env.local
# then edit .env.local — at minimum set MONGODB_URI

# 3. Create the first admin user (writes a hashed password to the staff collection)
npm run create-admin

# 4. Run dev server
npm run dev
# → http://localhost:3000/login
```

Sign in with the email + password printed by `create-admin`.

## Required environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `ADMIN_EMAIL` | no | Email for the seeded admin (default `admin@theplacepp.com`) |
| `ADMIN_PASSWORD` | no | Initial password for the seeded admin (default `Theplace2026`) |
| `ADMIN_NAME` | no | Display name for the seeded admin |
| `OPENAI_API_KEY` | no | Enables AI workout / meal-plan suggestions |

`.env.local` is gitignored — never commit it.

## Useful scripts

```bash
npm run dev                       # Next.js dev server
npm run build                     # Production build
npm run lint                      # ESLint
npm run create-admin              # Seed / update the admin staff row
npm run hash-existing-passwords   # One-shot: hash any legacy plaintext passwords in staff
npm run smoke-test                # Hit each API route with a small fixture
npm run seed-db                   # Seed dev DB with mock data
npm run reset-db                  # Drop + reseed dev DB
```

## Password handling

Passwords are hashed with Node's built-in `scrypt` (`src/lib/password.ts`) and stored in the form `scrypt$<salt>$<hash>`. The login route accepts both formats and silently upgrades any legacy plaintext row on its next successful sign-in. To bulk-upgrade existing rows in one pass, run `npm run hash-existing-passwords`.

There is no forgot-password flow at the moment — admins reset passwords directly via the Staff page in the dashboard. (If you want self-service reset back, you'll need to add an email provider and re-enable an OTP route.)

## Permissions & departments

Sidebar items and pages gate on a permission key (see `src/types/staff.ts` for the full list). Each department gets a default permission set (`DEFAULT_PERMISSIONS_BY_DEPARTMENT`), which the staff create flow applies unless an explicit permission list is provided.

PT and PTS staff see "Active Clients" instead of "Members"; everyone else sees Members.

## Project structure

```
src/
├── app/                # Next.js App Router
│   ├── api/            # API routes (MongoDB-backed, no mock fallbacks)
│   ├── dashboard/      # Authenticated dashboard pages
│   └── login/          # Login page
├── components/         # Shared UI (Shadcn + project-specific)
├── data/               # Static config — sidebar menus etc.
├── features/dashboard/ # Page-level feature folders (one per dashboard route)
├── hooks/              # React Query data hooks
├── lib/                # Server-side helpers (mongodb, logger, password, etc.)
├── providers/          # Auth + theme + react-query providers
└── types/              # Shared TS types
scripts/                # One-off ops scripts (create-admin, smoke-test, migrations)
```

## Tech notes

* **API routes** return `503 { error: "Database unavailable…" }` when MongoDB is unreachable instead of serving mock data. If you need to demo with no DB, run `npm run seed-db` against a local Mongo, or add a temporary mock route locally.
* **Roster** API requires `month` + `year` query params. The UI defaults to the current month on open.
* **Heavy pages** (Appointments, Members form, Overview) are scheduled for refactoring — see `AUDIT-VS-CURSOR.md` for the punch list.

## Deployment

See `DEPLOYMENT.md` for the Vercel + MongoDB Atlas setup. `vercel.json` is committed.

## License

Internal — © THE PLACE. See `LICENSE`.
