# THE PLACE — Full app audit

Walk-through of every role and feature, as of 2026-05-17. Verdicts are based on reading the actual code, not the README or comments. File:line references throughout.

---

## 1. Role & permission matrix

Defined in `src/types/staff.ts` and the auth provider.

### Roles (orthogonal to department)

| Role | Where stored | How granted |
| --- | --- | --- |
| `SUPERADMIN` | `users` collection (legacy) | Manual DB insert — no UI to create |
| `ADMIN` | `staff` collection (`role: "ADMIN"`) | Set on the staff form (Access Control section) |
| `STAFF` | `staff` collection (default) | Default for everyone else |

`isAdmin` is `role === ADMIN || SUPERADMIN`. `isManager` is `isAdmin || department === CM || department === ASM`. `canDelete` is `isManager`. (`src/providers/auth-provider.tsx:55-69`.)

### Department default permissions (`src/types/staff.ts:43-52`)

| Dept | Meaning | Default permissions |
| --- | --- | --- |
| **PT** | Personal Trainer | dashboard, appointments, program, members |
| **PTS** | PT Supervisor (← your role) | dashboard, appointments, program, members, **roster** |
| **FC** | Fitness Consultant | dashboard, members, program, view_reports |
| **FCS** | FC Supervisor | + roster |
| **CC** | Customer Care | dashboard, members, view_reports |
| **CCS** | CC Supervisor | + roster |
| **CM** | Club Manager | **everything** |
| **ASM** | Assistant Manager | **everything** |

**Critical mismatch for your mission:** PTS does NOT get `manage_staff` or `view_reports` by default. That blocks you from:
- Editing the staff records of your team (`manage_staff`).
- Seeing the PT Package Invoice report — which is the only place commission data lives (`view_reports`).

Either bump the PTS default permission set, or grant those two permissions to your specific user. Recommended below.

---

## 2. Auth, sessions, gating

| Area | Verdict | Notes |
| --- | --- | --- |
| Password hashing | ✅ | scrypt via `src/lib/password.ts`; legacy plaintext upgraded on login. |
| Cookie security | ✅ | httpOnly, sameSite=lax, secure in prod, 7-day maxAge. |
| Session refresh on permission change | ⚠️ | Cookie is static JSON. If you flip someone's permissions or `loginEnabled`, they stay in until cookie expires or they log out. Acceptable but worth knowing. |
| Sidebar permission gates | ✅ | `sidebar-menu-wrapper.tsx:74-97` enforces `hideForDepartments`, `showOnlyForDepartments`, and `requiredPermission` *before* mounting. Items disappear cleanly. |
| Page-level guards | ❌ | Dashboard page wrappers (e.g. `src/app/dashboard/staff/page.tsx`) don't check permission. Anyone signed in can type the URL and reach the page. The component then quietly returns empty or whatever the API allows. |
| Next.js middleware | ❌ | None. Each API route is on its own. |
| `permission-denied-dialog` | ❌ | Component exists but is never wired up — items just silently disappear. |

### API permission checks (sampled)

| Route | Session check | Notes |
| --- | --- | --- |
| `POST /api/auth/login` | n/a | ✅ Fixed in previous pass. |
| `GET /api/clients` | ✅ | Scoped to PT/PTS + admins; PT/PTS see only their assigned clients. |
| `GET/POST/PATCH/DELETE /api/leave-requests` | ✅ | Session required; supervisors see PENDING; staff see own; only PENDING is deletable by owner. |
| `GET/POST /api/staff` | ❌ | **No session, no role check on POST.** Anyone authenticated can create a staff row. |
| `GET/POST /api/appointments` | ❌ | **No session check anywhere.** Any cookie holder can create, edit, delete any appointment. |
| `GET/PUT/DELETE /api/appointments/[id]` | ❌ | Same — no scope, so a PT can mutate another PT's appointments. |
| `GET/POST/PUT/DELETE /api/pt-packages*` | ❌ | No session, no ownership scope — financial data fully open. |
| `GET/POST /api/roster` | ❌ | No session, no scope — any staff can rewrite anyone's roster. |
| `POST /api/ai/suggest-*` | ❌ | No session — OpenAI key can be burned by anyone with a cookie. |

**This is the single biggest production blocker.** Until appointments, pt-packages, roster, staff, and AI endpoints check the session and scope by owner / department, the permission system is mostly cosmetic — every page does the right thing in the UI, but the API will accept any request.

---

## 3. Members + Active Clients

### Members list (`src/features/dashboard/pages/members/index.tsx`, `members-table*`)

- ✅ TanStack table, pagination, click-row → detail by memberNumber.
- ❌ Filters are search-only. No status, membership-type, expiring-soon, or date-range filter. No sortable columns in the UI (the state hook supports it, but the column headers aren't wired up).
- ❌ No bulk actions (select-all, batch status change, batch message).
- 🟡 Mobile: table scrolls horizontally; no card layout.

### Member detail (`src/features/dashboard/pages/members/detail.tsx`, `[id]/page.tsx`)

- ✅ Rich profile, three tabs (Information / Medical / Documents), ring indicators for membership days + PT sessions remaining.
- ✅ Activity feed assembled from membership records, PT records, and appointments (`generateMemberActivities`).
- ❌ **Bug**: `detail.tsx:111` references `currentMember` before declaration at line 389 — will throw a ReferenceError on first render under some paths. Verify with a runtime check.
- ❌ No no-show tracking on the timeline (appointments must be COMPLETED to appear).
- ❌ No urgency badge for day-pass holders even though they expire in 1 day.

### Member form drawer (1,652 lines)

- ✅ Four-step form (Info / Payment & Packages / Medical / Rules) with Zod validation. Day-pass expiry handled at +1 day; other memberships +1/3/6/12 months.
- ❌ **Bug**: `handleSaveMember` on the parent (`pages/members/index.tsx:38`) is an empty `async () => {}` stub. Submitting closes the drawer without saving. This is the most expensive bug on the audit list — the form looks like it works.
- ❌ No draft / save-progress. Close drawer = lose everything.
- ❌ Step 1 client-side validation only fires on submit, not on "Next".

### Package management dialogs

- ✅ Manage Membership: extend, set new expiry, reason. Day-pass duration = 0 months.
- ✅ Manage PT Package: extension, change start date, cut sessions, undo sessions.
- ❌ `manage-pt-package-dialog.tsx:38` still imports `mockAppointments` from `@/lib/mock-data` and uses it to compute `usedSessions`. **PT session balances are derived from a mock data file, not real appointments.** This is the second-most expensive bug — your team's package balances are fictional until this is fixed.
- ❌ No expiry banner / countdown.
- ❌ No way to transfer sessions between trainers — you have to cut on trainer A and re-issue on trainer B.

### Active Clients (`pages/active-clients/index.tsx`)

- ✅ Hook `useClients()` correctly scopes to `sessionStaffId` so trainers see only their own clients (`src/hooks/use-clients.ts:12-27`).
- ❌ "Active" means "has any PT package assigned to me", not "trained recently" or "appointment this week" — title is a bit aspirational.
- ❌ No bulk actions (reschedule, reassign, message).

---

## 4. Staff + Roster + Leave + Performance

### Staff list / detail

- ✅ Columns: ID, name, dept/level, status, monthly sale target (progress bar), conduct target (ring), actions.
- ❌ `GET /api/staff` returns **all** staff regardless of who's asking. A PTS sees the entire org, not just PT/PTS. Combined with the absent permission check on `manage_staff`, a PTS can read every staff record but cannot edit them.
- ❌ Filters are search-only. No dept / level chips, no "My Team" quick filter for supervisors.
- ❌ `POST /api/staff` has no admin gate (see auth section).

### Staff ratings

- ❌ Ratings are stored in `localStorage` only (`staff-ratings.ts:23-34`). Lost on browser clear. Not visible across devices. Not auditable. **Not usable for performance reviews.**

### Performance / targets

- ✅ `calculate-staff-metrics.ts`: PT/PTS sales summed from PT package records, FC/FCS from membership records — month-scoped, accurate.
- ✅ Conduct = count of COMPLETED appointments in the month.
- ❌ "Conduct" is just a count — no quality dimension (no-shows, session length, satisfaction).
- ❌ Detail page has no historical trend (month over month). No "PT1 vs PT2 sales by month" comparison view. No alert when a target is at 50% halfway through the month.

### Roster

- ✅ Month grid, AM/MID/PM/NOON shift codes, day-off, leave codes (AL/SL/PH/UP). Month/year defaults to current. Search by name.
- ❌ No conflict detection — you can put two people on the same shift in a way that overloads coverage, with no warning.
- ❌ `POST /api/roster` has no session or scope check. A trainer could rewrite the entire roster.
- ❌ When you flip a staff member's status to ON_LEAVE_ANNUAL from the staff page, it updates the roster *and* increments `annualLeaveUsed` (`staff/index.tsx:268-272`) — that bypasses the leave-request approval flow, which already has its own balance logic.

### Leave requests

- ✅ Dialog is functional: select type, date range, reason, balance preview, warning if exceeding.
- ✅ API: POST creates PENDING; PATCH lets supervisors approve/reject; staff can DELETE only PENDING; approval triggers a staff note to the requester.
- ❌ **No supervisor UI page to review pending requests.** The API endpoint exists. The "approve / reject" logic is implemented. But the only ways to actually approve a request today are: (a) the notifications dropdown if you happen to see it, or (b) calling the API directly. There is no `/dashboard/leave-requests` page.
- ❌ Approval does **not** auto-deduct from `annualLeaveUsed` / `sickLeaveUsed`. Deduction happens via the inline roster-status hack on the staff page (see above). So approvals can drift out of sync with balances.

### Online presence / staff notes

- ✅ `/api/staff/heartbeat` + `useOnlineStaff()` hook. Sidebar shows online avatars with green dot, excludes self.
- ✅ Staff notes (internal DM-like) work, including the "request leave" + "send note" actions on online list entries (latter is supervisor-only).
- ⚠️ Online list is visible to everyone — no dept-level filtering.

### Sub-tables on staff detail page

- ✅ Appointments, FC membership records, trainer PT records, CC issued records — all correctly scoped to the viewed staff member.

---

## 5. Appointments + Program

### Appointments (`pages/appointments/index.tsx`, 2,660 lines)

- ✅ Day / week / month views; new-appointment modal walks member → package → trainer → date/time.
- ✅ Search (name/trainer/client), category filter, trainer filter, status workflow SCHEDULED → COMPLETED / NO_SHOW / CANCELLED.
- ❌ **No double-booking detection.** The booking flow checks if the trainer is `AVAILABLE` on that day per roster, but does not check for overlapping time slots on the same trainer. You can stack two clients on the same PT at 10:00.
- ❌ **PT session balance is computed at the frontend** from the appointment list (count of COMPLETED), not persisted on the package record. Marking an appointment COMPLETED does **not** decrement a `remainingSessions` field on the PT package — it just changes what the frontend tallies. If two PTs share a package by mistake (unlikely but possible), the count is correct but there is no server-side source of truth.
- ❌ No-show count surfaces on the dashboard chart as "cancelled" but is not separately exposed per trainer / per member. No rating impact.
- ❌ No drag-to-reassign trainer; no team-wide day view; no batch reminders.
- ⚠️ **2,660-line monolith** — a long-standing refactor item.

### Program (`pages/program/index.tsx`)

- ✅ Two tabs (workout / meal), AI suggestion buttons on each. Programs are saved per `trainerId`; admins see all.
- ✅ AI prompts are decent (`/api/ai/suggest-workout` uses ACE/NASM/ACSM framing; meal plan uses TDEE math + a `COMMON_FOODS` reference list).
- ❌ AI routes don't check session — anyone with a cookie can spam your OpenAI quota.
- ❌ Workout / meal plan generation doesn't read the member's medical info; user-supplied "trainer notes" are the only safeguard.
- ⚠️ Meal-planner logic is duplicated in two places: the Program page's meal tab AND a standalone `/dashboard/meal-planner` page that does roughly the same thing. Pick one.

---

## 6. Packages (Services) + Reports

### Packages page (`/dashboard/services`)

- ✅ Full CRUD on membership types (Day Pass / 1 / 3 / 6 / 12 month) and PT package types (1 / 5 / 10 / 20 / 30 / 40 session).
- ❌ Editing a package price is **live** — there's no versioning. Yesterday's invoice and today's invoice both read the same `price` field on the type, so historical reports drift if you change a price.
- ❌ Deleting a type is a hard delete with no cascade warning. Existing invoice records are denormalized (they store the name), so reports don't blow up, but the link back to the type is lost.
- ❌ Sidebar still routes Packages to `/dashboard/services`; URL keep is fine but the page title inside also reads "Services" in places — worth a sweep.

### Membership Invoice report

- ✅ KPIs (total, revenue, active, expiring soon), search, sort, pagination, edit, delete, export to CSV ("Excel") + PDF.
- ❌ Filter is search-only. No date-range, no payment-status (paid / partial / refunded), no membership-type chips.

### PT Package Invoice report

- ✅ Same shape as membership invoice plus a "Total Sessions" KPI.
- ❌ **No commission column. No commission anywhere on the report.** `commissionPercentage` lives on the Staff record (per trainer), but PT package types and PT package records have no commission fields. Calculated commission is not stored, not displayed, not exported.
- ❌ Export utility never references commission either.
- ❌ Gated on `view_reports` — which PT/PTS don't have by default. So under default permissions: **you cannot see commission for your own team in the app.** Today the only way to get commission data is to read the staff `commissionPercentage` and multiply by `amount` in your head.

### Exports

- ✅ Export utilities for both invoice tables and for workout / meal plans.
- ⚠️ CSV is labeled "Excel" but it's just `.csv` — fine, but the icon copy is misleading.
- ⚠️ PDF is `window.print()` styled — depends on the browser's print pipeline. Works for single users; not great for batch payroll exports.

---

## 7. Overview + Header + Notifications

### Overview (`pages/overview/index.tsx`, 1,261 lines)

- ✅ KPI cards: Available Staff, Total Revenue (vs target), Total Sessions (vs target), Expiring Soon.
- ✅ Charts: stacked daily revenue (membership + PT), radial appointment performance (completed vs cancelled).
- ✅ Date range defaults to current month; per-role data scoping for PT/PTS.
- ✅ Skeletons and empty states present on every card.
- ⚠️ Heavy first-load — it fetches staff, members, appointments, memberships, PT packages all at once. Considering `staleTime: 30s` this is OK in steady-state.
- ❌ No-show count is not a distinct KPI; it's hidden inside the appointment-perf chart.
- ❌ No "team on leave this week" card for supervisors.
- ❌ No "my clients expiring today" shortcut for PT/PTS.

### Notifications dropdown

- ✅ Big coverage: recent invoices, today's completed + upcoming appointments, expiring memberships + PT packages, new members, birthdays (members + staff), staff notes, pending leave requests (supervisors only).
- ✅ Role-filtered; PT/FC see only their slice.
- ✅ Read state per-user in localStorage; staff notes also marked read in DB.
- ⚠️ Auto-marks-as-read on open — a bit aggressive; means quickly opening the dropdown clears alerts you might want to come back to. Consider only marking individual notes as read when clicked.
- ⚠️ No real-time updates — polled via React Query on window focus, ~30s stale.

### Sidebar & dialogs

- ✅ Permission gating actually works (see auth section).
- ✅ Change-password, leave-request, send-note dialogs all wired up.
- ❌ `permission-denied-dialog.tsx` exists but is never invoked.
- ✅ "Loading…" placeholder replaces the old "James" / "james@example.com" defaults after the last pass.

### Theme / mobile / landing

- ✅ Sticky header, collapsible sidebar (persisted in localStorage), light/dark toggle.
- ✅ `/` → `/login` redirect; no marketing surface.

---

## 8. Cross-cutting bug list (prioritized)

| # | Severity | What | Where |
| --- | --- | --- | --- |
| 1 | 🔴 Data integrity | Member form drawer's `onSave` is a no-op stub — form silently swallows submissions. | `pages/members/index.tsx:~38` |
| 2 | 🔴 Data integrity | PT session "used" count is derived from `mockAppointments`, not real data. | `manage-pt-package-dialog.tsx:38` |
| 3 | 🔴 Security | Appointments / PT-packages / roster / staff(POST) / AI endpoints accept any cookie holder. No session check, no ownership scope. | various API route files |
| 4 | 🔴 Logic | Approving a leave request doesn't auto-deduct the balance. Balance gets bumped only when the roster cell is flipped, which can drift. | `leave-requests/[id]/route.ts` PATCH |
| 5 | 🔴 Reporting | No commission data anywhere (model, table, report, export). PT/PTS also blocked from `view_reports` under default permissions. | `pt-package-record.ts`, `services/types/pt-package.ts`, report pages |
| 6 | 🔴 Bug | `detail.tsx:111` references `currentMember` before declaration. | `pages/members/detail.tsx` |
| 7 | 🟡 Storage | Staff ratings live in localStorage — not portable, not auditable. | `staff-ratings.ts` |
| 8 | 🟡 UX gap | No supervisor UI to approve leave requests (API exists). | n/a — page missing |
| 9 | 🟡 UX gap | No double-booking detection in appointments. | `pages/appointments/index.tsx` |
| 10 | 🟡 UX gap | All invoice/list filters are search-only — no date range, no status, no payment, no trainer. | invoice + members filter components |
| 11 | 🟢 Naming | "Services" still appears in some text even though sidebar renamed to "Packages"; route URL still `/dashboard/services`. | services page header, sub-headers |
| 12 | 🟢 Refactor | Meal-planner page duplicates the Program meal tab. | `pages/meal-planner/` vs `pages/program/` |

---

## 9. Role-by-role daily fit

### As **you (PTS — PT Supervisor)**

What works today:
- See your team's appointments, your clients on Active Clients, sales/conduct metrics on the staff list for everyone, leave-request dialog to request your own leave.

What's missing or broken for your stated mission:
- ❌ You can't approve your team's leave requests in the UI.
- ❌ You can't see commission for your team (no data model + no permission).
- ❌ You can't manage your team's staff records (no `manage_staff`).
- ❌ Bookings can double-book your trainers.
- ❌ Member packages reflect mock data, so the balance you see may be wrong.
- ❌ Member create form silently fails.

### As **PT**

Active Clients works. Appointments works. Program works. Same security caveat as above (any PT can mutate any appointment via the API).

### As **FC / CC**

Members and reports work; FC has `view_reports` so commission absence is felt less acutely. CC doesn't have `manage_program` so Program is hidden.

### As **CM / ASM**

Full access to everything. Same data-integrity bugs apply.

### As **SUPERADMIN**

Same UI as ADMIN. Lives in legacy `users` collection so it's outside the staff create/update flow — only manual DB insert can create one. Practical use today is just the bootstrap account.

---

## 10. Recommendations (prioritized)

### P0 — fix this week

1. **Wire `handleSaveMember`** in `pages/members/index.tsx`. This is silent data loss.
2. **Stop reading mock data for real session balances.** Replace `mockAppointments` in `manage-pt-package-dialog.tsx` (and `members-table-columns.tsx` if used) with the real appointments query.
3. **Add session + permission checks** to appointments, pt-packages, roster, staff (POST), and AI endpoints. The pattern from the audited `clients` route is the right template. Either ship a tiny `requireSession()` helper + use it in every API route, or introduce a `src/middleware.ts` that gates `/api/*` except `auth/login` and `auth/session`.
4. **Add `manage_staff` and `view_reports` to PTS** in `DEFAULT_PERMISSIONS_BY_DEPARTMENT`. Also grant them to your specific user so you can manage your team.
5. **Fix the `currentMember` ReferenceError** in member detail.

### P1 — next two weeks

6. **Build `/dashboard/leave-requests` supervisor UI**: pending list + approve/reject + show reason + auto-deduct balance on approval. Remove the inline balance update on the staff page.
7. **Commission data model**: add `commissionPercentage` and `commissionAmount` to PT package records (snapshot at sale time to survive trainer rate changes). Surface a Commission column on the PT Package Invoice + export. Add a "by trainer" group-by toggle for supervisors.
8. **Double-booking guard** in the appointment booking flow: check overlap with existing scheduled appointments for the same trainer.
9. **Real per-package session deduction**: when an appointment is COMPLETED, mutate a `sessionsUsed` field on the linked PT package record; balance becomes server-side truth.
10. **Filters everywhere**: date range, payment status, membership/PT package type, trainer chips — at minimum on the two invoice reports and the members list.

### P2 — month-out polish

11. **Move staff ratings into the DB** so they survive devices and feed performance reviews.
12. **Performance trend tab** on staff detail: month-over-month sales + conduct vs target; rank within department.
13. **"My team" section** on Overview for supervisors: today's roster, anyone on leave this week, sales vs target deltas for each direct report, alerts when a target is in the red mid-month.
14. **Split the 2,660-line Appointments file** into book / edit / cancel sub-flows; sticky filters; mobile-friendly time picker. Same for `member-form-drawer` (stepped tabs, save-progress per step).
15. **Wire `permission-denied-dialog`** so a user who somehow lands on a permission-gated page sees a clear message instead of an empty screen.
16. **Hash a price/commission snapshot onto every invoice** so editing a package type later doesn't retroactively rewrite history.

### P3 — nice-to-have

17. Global search (member name, phone, staff ID).
18. Audit log for membership + PT package changes.
19. Role-based home (PT → Active Clients; admin → Overview).
20. Mobile card layout for tables that don't fit on a phone (roster grid, appointment calendar).
21. Native `.xlsx` export (using the `xlsx` dep already in `package.json`).

---

## 11. What's good

- Permission-aware sidebar that disappears items instead of greying them.
- Solid type system + Zod schema validation on the API surface.
- Notifications dropdown is comprehensive and role-aware.
- Active Clients correctly scopes by `sessionStaffId` — no cross-trainer cache bleed.
- Calculations (sales/conduct) are correct and month-scoped.
- After the last security pass: hashed passwords, no mock-data fallback in APIs, consolidated admin login.

The skeleton is there. The blockers are: a few silent data-integrity bugs (member form, mock-data session balance), API auth across the write endpoints, and commission as a first-class concept.
