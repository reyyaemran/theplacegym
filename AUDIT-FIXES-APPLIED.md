# Changes applied — 2026-05-16

Walk-through of what was changed in this session against the `AUDIT-VS-CURSOR.md` punch list. TypeScript type-check passes (`npx tsc --noEmit` clean) after all changes.

## ✅ Done

### Security
- **Password hashing.** New helper `src/lib/password.ts` using Node's built-in `scrypt` (no external dep — `npm install bcryptjs` was blocked from this sandbox; scrypt is equally strong and ships with Node).
  - Login route compares with `checkPassword`; legacy plaintext rows are accepted **once** and silently upgraded to scrypt on successful login.
  - `scripts/create-admin.ts` now hashes before writing.
  - `POST /api/staff` hashes incoming `password`.
  - `PUT /api/staff/[id]` hashes any password change that isn't already in scrypt form.
  - `POST /api/auth/change-password` verifies via `checkPassword` and writes the hashed result.
  - `password` was added to `staffSchema` (validation) since the form drawer already sends it.
- **Mock-data fallback removed** from all data API routes. They now return `503 { error: "Database unavailable. Please try again shortly." }` when MongoDB is unreachable. 36 fallback branches removed across 14 route files (appointments, members, memberships, package-types/memberships, pt-packages, programs, meal-plans, requests, roster, staff). `health` route was deliberately left as-is — it should still report status, not 503.
- **Admin login consolidated.** Login route is now single-path: staff collection + hashed password. Removed env `ADMIN_EMAIL`/`ADMIN_PASSWORD` fallback and the `users` SUPERADMIN lookup. `change-password` no longer has a SUPERADMIN special-case.

### Forgot password
- Routes deleted: `src/app/api/auth/forgot-password/send-otp/` and `.../reset/`.
- Component deleted: `src/components/login/forgot-password-dialog.tsx`.
- Login page: removed import, state, "Forgot password?" link, dialog mount.
- `resend` removed from `package.json`.
- `.env.example` no longer mentions Resend.

### Navigation & polish
- Sidebar "Services" → "Packages" (`src/data/sidebar-menus.tsx`). Route URL `/dashboard/services` kept to avoid breaking deep links and bookmarks.
- Sidebar user defaults `James` / `james@example.com` replaced with `Loading…` / empty (session provider overrides them with real staff anyway).
- README rewritten for THE PLACE — setup, env vars, `create-admin`, smoke-test, password handling notes, project structure.

### Roster
- UI already defaults to current month + year on open (`useState(new Date().getMonth() + 1)`), so no UI change needed. Recommendation was already implemented.

### Migration & ops
- New script `scripts/hash-existing-passwords.ts` (one-pass migration, idempotent — skips rows already in scrypt form). Wired up as `npm run hash-existing-passwords`.

## ⏸ Deferred — needs its own session

These are the heavy refactors that would each be days of careful work. They are still on the list, but doing them mid-stream alongside everything else above would have risked breakage:

1. **Split Appointments** (`src/features/dashboard/pages/appointments/index.tsx`, 2,660 lines) into book / edit / cancel flows + sticky filters.
2. **Stepped tabs on Members form** (`member-form-drawer.tsx`, 1,652 lines) — Profile → Membership → PT with per-step save.
3. **Overview perf pass** (`overview/index.tsx`, 1,261 lines) — default "This month", skeletons on every card, empty states.
4. Audit-log for membership/PT changes.
5. Global search across members + staff.
6. Role-based home (PT → Active Clients, admin → Overview).
7. Mobile layout pass for roster grid + appointment calendar.
8. Toast standardization across members/staff/appointments.

## Verification

- `npx tsc --noEmit` → clean (no errors).
- `grep "forgot-password\|ForgotPassword" src/` → empty.
- `grep "MONGODB_URI" src/app/api/` → only `health/route.ts` (intentional).
- `grep "James\|james@example" src/data/sidebar-menus.tsx` → empty.
- ESLint did not run cleanly in the sandbox due to a circular-config issue in `@eslint/eslintrc`, unrelated to these changes. Run `npm run lint` locally to confirm.

## After you pull this down

```bash
# 1. Reinstall (resend was removed)
npm install

# 2. Run the password migration ONCE on each environment
npm run hash-existing-passwords

# 3. Smoke-test
npm run smoke-test

# 4. (Optional) Re-seed an admin to verify the hashed-password path:
npm run create-admin
```

After the migration runs, every row in the `staff` collection should have a `password` starting with `scrypt$`. The login route will keep accepting plaintext for any row that hasn't been migrated yet, but you should not rely on that.
