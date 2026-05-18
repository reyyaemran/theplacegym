# Audit: project vs. Cursor's UX recommendations

Comparing each item Cursor flagged against what's actually in the code at
`/Users/cryptoshi/Documents/TP - THE PLACE 1.1/` as of 2026-05-16.

Legend: ✅ accurate · ⚠️ partly accurate / needs nuance · ❌ wrong

---

## High impact / security

**1. Hash passwords — ✅ accurate (top priority).**
Confirmed plaintext everywhere:
- `src/app/api/auth/login/route.ts:113` → `staff.password === passwordInput`
- `scripts/create-admin.ts:42` → stores `password: ADMIN_PASSWORD` as-is
- `src/app/api/auth/login/route.ts:14-19` → env `ADMIN_PASSWORD` compared raw
No `bcrypt` / `argon2` / `scrypt` import anywhere in `src/`.

**2. Remove or gate mock-data fallback in production — ✅ accurate.**
Confirmed `MONGODB_URI`-error → mock fallback in:
- `src/app/api/auth/login/route.ts` (falls back to `mockStaff`)
- `src/app/api/staff/route.ts`
- `src/app/api/appointments/route.ts`
- `src/app/api/members/[id]/route.ts`
- `src/app/api/programs/route.ts`
A request that succeeds against fake data when the DB is down is exactly the production hazard Cursor described.

**3. Consolidate admin login paths — ✅ accurate.**
Login route currently tries, in order: `users` collection with `role: "SUPERADMIN"` → fallback to env `ADMIN_EMAIL`/`ADMIN_PASSWORD` → `staff` collection by email. Three independent surfaces; collapsing to "staff collection + hashed password" is the right consolidation.

---

## Navigation & labeling

**1. "Services" label uses `view_reports` permission — ✅ accurate.**
`src/data/sidebar-menus.tsx:67-70` → `title: "Services"`, `requiredPermission: "view_reports"`, points at `/dashboard/services`, which lists membership and PT packages. Label/permission/content all mismatched. "Packages" + `manage_packages` (or similar) would be more honest.

**2. `/dashboard` and Overview are the same — ✅ accurate.**
`src/app/dashboard/page.tsx` and `src/app/dashboard/overview/page.tsx` both render `<OverviewPage />`. Pick one canonical URL.

**3. PT vs front-desk hint — ✅ accurate.**
`src/data/sidebar-menus.tsx` → Members has `hideForDepartments: ["PT","PTS"]` (line 55), Active Clients has `showOnlyForDepartments: ["PT","PTS"]` (line 62). The behaviour is correct; a one-line hint on first PT login is still worth adding.

---

## Login & account

**1. Forgot-password requires `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — ✅ accurate.**
`src/app/api/auth/forgot-password/send-otp/route.ts:59-65`. In **dev**, missing key returns the OTP in the response body (good); in **production**, missing key just logs the OTP server-side and returns `success: true` — the user sees a "code sent" screen, then waits for an email that never arrives. That's the broken-feeling flow Cursor described. Fix: return 503 + "email not configured" when key is missing in prod.

**2. Login errors generic — ✅ accurate.**
`src/app/api/auth/login/route.ts:107, 119` both return `"Invalid email or password"`. Cursor's recommendation (stay generic, but add "Contact your manager" for the `loginEnabled === false` case) is already half-implemented — line 127 returns "Login access is disabled… contact your manager", which is good.

---

## Core workflows

**1. Appointments very large (~2.6k lines) — ✅ accurate.**
`src/features/dashboard/pages/appointments/index.tsx` = **2,660 lines**. Splitting into book/edit/cancel sub-flows is the right call.

**2. Members form long drawer — ✅ accurate.**
`src/features/dashboard/pages/members/components/member-form-drawer.tsx` = **1,652 lines**. Stepped tabs (Profile → Membership → PT) is reasonable.

**3. Overview heavy on first load — ✅ accurate.**
`src/features/dashboard/pages/overview/index.tsx` = **1,261 lines**. Default to "This month" + skeletons + empty states is sensible.

**4. Roster requires month/year — ✅ accurate.**
`src/app/api/roster/route.ts` requires `month` + `year` query params. UI should default to current month on open.

---

## Polish

**1. Sidebar `James` / `james@example.com` leftovers — ✅ accurate.**
`src/data/sidebar-menus.tsx:16-17`: `name: "James"`, `email: "james@example.com"`. (Note: Cursor named the file `sidebar-menus.tsx` — correct path is `src/data/sidebar-menus.tsx`, not under `components/sidebar/`.)

**2. Toasts & errors standardize — ⚠️ valid but unverified at scope.**
Didn't enumerate every toast call, but the recommendation is generally sound; no contradicting evidence.

**3. Mobile testing — N/A.**
Can't test responsive behaviour from a static audit. Recommendation stands.

**4. README still generic "Shadcn CRM" — ✅ accurate.**
`README.md` line 1: "Shadcn CRM Dashboard - UI". No mention of THE PLACE, gym CRM, `MONGODB_URI`, `create-admin`, smoke test, or any env vars. Replacing this is a quick win.

---

## Nice-to-have

Global search, audit log, role-based home — all reasonable, none present in code. No comment beyond agreeing they're not implemented.

---

## What works well (Cursor's positives — also accurate)

- Email + password login with session cookie + redirect: ✅ present in `src/app/api/auth/login/route.ts` and `src/app/login/page.tsx`.
- Permission-based sidebar with `requiredPermission` + department gating: ✅ `src/data/sidebar-menus.tsx`.
- Meal planner under Program: ✅ `src/app/dashboard/meal-planner/page.tsx` exists alongside `src/app/dashboard/program/page.tsx`.
- Reports submenu real invoice views: ✅ `membership-invoice` and `ptpackage-invoice` pages exist.
- Build / API stable: not verified end-to-end, but no obvious wiring breakage.

---

## Overall verdict

Cursor's audit is **accurate**. Every checkable claim lines up with the code — the only nit is the sidebar file path (it's under `src/data/`, not `components/sidebar/`). Priority order is also sensible: password hashing + mock-data fallback + admin-path consolidation genuinely are the production blockers; everything else is UX polish that can ship later.

## Recommended order of attack

1. **bcrypt rollout** (login compare → `create-admin` → staff create/update routes → migration to hash existing rows).
2. **Kill mock-data fallback** in API routes; return 503 on DB failure.
3. **Collapse admin login** to "staff + hashed password" only; deprecate env super-admin.
4. **Forgot-password prod guard** for missing Resend key.
5. **Rename Services → Packages** and pick `manage_packages` permission.
6. **Strip "James" defaults** from `sidebar-menus.tsx`.
7. **Rewrite README** for THE PLACE.
8. Then tackle the big-file refactors (appointments, member-form, overview) as separate PRs.
