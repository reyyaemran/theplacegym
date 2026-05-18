/**
 * API smoke test — run with dev server up: npm run dev
 * Usage: npx tsx scripts/smoke-test.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL || "admin@theplacepp.com";
const PASSWORD = process.env.TEST_PASSWORD || "Theplace2026";

type Result = { name: string; ok: boolean; status?: number; detail?: string };

const results: Result[] = [];

function jarFromSetCookie(headers: Headers): string {
  const cookies = headers.getSetCookie?.() ?? [];
  if (cookies.length) {
    return cookies.map((c) => c.split(";")[0]).join("; ");
  }
  const single = headers.get("set-cookie");
  return single ? single.split(",").map((c) => c.split(";")[0].trim()).join("; ") : "";
}

async function req(
  name: string,
  path: string,
  opts: RequestInit & { expectAuth?: boolean } = {},
  cookie = ""
): Promise<string> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (cookie) headers.Cookie = cookie;

  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    const ok =
      res.ok ||
      (opts.expectAuth === false && res.status === 401) ||
      (name.includes("health") && res.status === 200);

    let detail = `${res.status}`;
    if (!ok) {
      try {
        const j = await res.json();
        detail += ` ${JSON.stringify(j).slice(0, 120)}`;
      } catch {
        detail += ` ${(await res.text()).slice(0, 80)}`;
      }
    }
    results.push({ name, ok, status: res.status, detail });
    return jarFromSetCookie(res.headers) || cookie;
  } catch (e) {
    results.push({
      name,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
    return cookie;
  }
}

async function main() {
  console.log(`\nSmoke test → ${BASE}\n`);

  let cookie = await req("GET /api/health", "/api/health", { method: "GET" });

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  cookie = jarFromSetCookie(loginRes.headers) || cookie;
  const loginOk = loginRes.ok;
  results.push({
    name: "POST /api/auth/login",
    ok: loginOk,
    status: loginRes.status,
    detail: loginOk ? "session set" : await loginRes.text().then((t) => t.slice(0, 100)),
  });

  if (!loginOk) {
    console.error("Login failed — skipping authenticated routes");
    printResults();
    process.exit(1);
  }

  cookie = await req("GET /api/auth/session", "/api/auth/session", {}, cookie);

  const routes: Array<[string, string]> = [
    ["GET /api/staff", "/api/staff"],
    ["GET /api/members", "/api/members"],
    ["GET /api/clients", "/api/clients"],
    ["GET /api/appointments", "/api/appointments"],
    ["GET /api/pt-packages", "/api/pt-packages"],
    ["GET /api/memberships", "/api/memberships"],
    ["GET /api/roster", `/api/roster?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`],
    ["GET /api/leave-requests", "/api/leave-requests"],
    ["GET /api/staff-notes", "/api/staff-notes"],
    ["GET /api/staff/online", "/api/staff/online"],
    ["GET /api/package-types/pt-packages", "/api/package-types/pt-packages"],
    ["GET /api/package-types/memberships", "/api/package-types/memberships"],
    ["GET /api/programs", "/api/programs"],
    ["GET /api/meal-plans", "/api/meal-plans"],
    ["GET /api/requests", "/api/requests"],
    ["GET /api/health", "/api/health"],
  ];

  for (const [name, path] of routes) {
    cookie = await req(name, path, {}, cookie);
  }

  // Pages (HTML)
  const pages = ["/login", "/dashboard", "/dashboard/overview", "/dashboard/members", "/dashboard/staff"];
  for (const path of pages) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
      results.push({
        name: `GET ${path}`,
        ok: res.ok,
        status: res.status,
      });
    } catch (e) {
      results.push({ name: `GET ${path}`, ok: false, detail: String(e) });
    }
  }

  printResults();
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printResults() {
  const w = Math.max(...results.map((r) => r.name.length), 10);
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(
      `${icon} ${r.name.padEnd(w)}  ${r.status ?? "—"}  ${r.detail ?? ""}`
    );
  }
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} passed\n`);
}

main();
