/**
 * Import PT Balance Sessions from Excel into MongoDB
 *
 * Imports:
 * - Members (clients) with memberNumber and fullName from the Excel
 * - Staff (trainers) if not already present - by STAFFID and PT Associated name
 * - PT Package records with member, package details, and assigned trainer
 *
 * Usage: npx tsx scripts/import-pt-balance-excel.ts [path-to-excel]
 *        npx tsx scripts/import-pt-balance-excel.ts --replace [path-to-excel]
 *
 * --replace: Clear ALL pt-packages first, then import fresh (use to fix duplicates)
 * Default path: ~/Downloads/PT BALANCE SESSIONS Jan-Feb 20th.xlsx
 *
 * Ensure MONGODB_URI is set in .env.local
 */

import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";
import * as XLSX from "xlsx";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI: string = process.env.MONGODB_URI || "";
const DB_NAME = "theplace";

const DEFAULT_EXCEL_PATH =
  process.env.HOME + "/Downloads/PT BALANCE SESSIONS Jan-Feb 20th.xlsx";

interface ExcelRow {
  "Invoice No"?: number | string;
  "Sales Date"?: Date | string;
  idmember?: number | string;
  Name?: string;
  "PT Contract"?: number | string;
  "PT Packages"?: string;
  "Total Sessions"?: number | string;
  "Used Sessions"?: number | string;
  "Remaining Sessions"?: number | string;
  Amount?: number | string;
  "Start Date"?: Date | string;
  "Expiration Date"?: Date | string;
  STAFFID?: number | string;
  "PT Associated"?: string;
  "Issued By : "?: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse amount from Excel - handles "1,000.00" comma strings */
function parseAmount(val: number | string | undefined): number {
  if (val == null) return NaN;
  const s = String(val).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

/** Parse date to YYYY-MM-DD - handles DD-Mon-YYYY, Excel serial, ISO, Date */
function toDateStr(val: Date | string | number | undefined): string {
  if (val == null || (typeof val === "number" && isNaN(val))) return "";
  if (typeof val === "string") {
    const m = val.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (m) {
      const [, day, mon, year] = m;
      const month = MONTH_MAP[mon?.toLowerCase() ?? ""];
      if (month !== undefined) {
        const y = parseInt(year!, 10);
        const M = month + 1;
        const d = parseInt(day!, 10);
        return `${y}-${String(M).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
    return val.split("T")[0] || val;
  }
  if (val instanceof Date) return val.toISOString().split("T")[0] || "";
  if (typeof val === "number") return new Date(val).toISOString().split("T")[0] || "";
  return "";
}

function toNum(val: number | string | undefined): number {
  if (val == null) return NaN;
  const s = String(val).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? NaN : Math.floor(n);
}

function isValidRow(row: ExcelRow): boolean {
  const id = toNum(row.idmember);
  const name = row.Name;
  const sessions = toNum(row["Total Sessions"]);
  const invoiceNo = row["Invoice No"];
  const startDate = toDateStr(row["Start Date"]);
  const expiryDate = toDateStr(row["Expiration Date"]);
  const amount = parseAmount(row.Amount);
  const ptName = row["PT Associated"];

  return !!(
    !isNaN(id) &&
    id >= 0 &&
    name &&
    String(name).trim() &&
    !isNaN(sessions) &&
    sessions >= 1 &&
    invoiceNo != null &&
    String(invoiceNo).trim() !== "" &&
    startDate &&
    expiryDate &&
    !isNaN(amount) &&
    amount >= 0 &&
    ptName &&
    String(ptName).trim()
  );
}

async function run() {
  const args = process.argv.slice(2);
  const replaceMode = args.includes("--replace");
  const excelPath = args.find((a) => !a.startsWith("--")) || DEFAULT_EXCEL_PATH;

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  console.log("📂 Reading Excel:", excelPath);
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

  const validRows = rows.filter(isValidRow);
  console.log(`   Found ${validRows.length} valid rows (${rows.length} total)\n`);

  if (validRows.length === 0) {
    console.error("❌ No valid rows to import");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);
    const membersCol = db.collection("members");
    const staffCol = db.collection("staff");
    const ptPackagesCol = db.collection("pt-packages");
    const ptPackageTypesCol = db.collection("pt-package-types");

    if (replaceMode) {
      const deleted = await ptPackagesCol.deleteMany({});
      console.log(`🗑️  Cleared ${deleted.deletedCount} existing PT package records (--replace)\n`);
    }

    // 1. Ensure PT package types exist (match by sessions)
    console.log("📦 Ensuring PT package types...");
    const sessionCounts = [...new Set(validRows.map((r) => toNum(r["Total Sessions"])))].filter(
      (n) => !isNaN(n) && n >= 1
    );
    const existingTypes = await ptPackageTypesCol
      .find({ sessions: { $in: sessionCounts } })
      .toArray();
    const existingBySessions = new Map(
      existingTypes.map((t) => {
        const doc = t as { sessions: number; id?: string; name?: string; _id?: ObjectId };
        return [
          doc.sessions,
          { id: doc.id || doc._id?.toString() || "", name: doc.name || "" },
        ] as [number, { id: string; name: string }];
      })
    );

    for (const sessions of sessionCounts.sort((a, b) => a - b)) {
      if (existingBySessions.has(sessions)) continue;
      const newType = {
        sessions,
        name: `PT Import - ${sessions} Sessions`,
        shortName: `${sessions} ss`,
        price: 0,
        pricePerSession: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await ptPackageTypesCol.insertOne(newType as any);
      existingBySessions.set(sessions, {
        id: res.insertedId.toString(),
        name: (newType as { name: string }).name,
      });
    }
    console.log(`   ✓ ${existingBySessions.size} package types available\n`);

    // 2. Ensure staff (trainers) exist
    console.log("👥 Ensuring staff (trainers)...");
    const trainerKeys = new Map<
      string,
      { staffId: string; name: string }
    >();
    for (const row of validRows) {
      const staffIdRaw = row.STAFFID;
      const staffId = staffIdRaw != null ? String(Math.floor(toNum(staffIdRaw))) : "";
      const name = row["PT Associated"]?.trim();
      if (!name) continue;
      const key = `${staffId}|${name}`;
      if (trainerKeys.has(key)) continue;
      trainerKeys.set(key, { staffId, name });
    }

    const staffIdToMongoId = new Map<string, string>();
    const staffIdToName = new Map<string, string>(); // Mongo ID -> actual staff name in DB
    let trainerImportCounter = 0;
    for (const { staffId, name } of trainerKeys.values()) {
      let mongoStaff = await staffCol.findOne({
        $or: [
          { staffID: staffId },
          { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        ],
      } as any);

      if (!mongoStaff && name) {
        trainerImportCounter += 1;
        const safeName = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "") || "trainer";
        const insert = {
          name,
          department: "PT",
          level: "Junior",
          status: "AVAILABLE",
          hireDate: new Date().toISOString(),
          staffID: staffId || `import-${safeName}-${trainerImportCounter}`,
          email: `pt-import-${safeName}-${trainerImportCounter}@import.placeholder`,
          loginEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const res = await staffCol.insertOne(insert as any);
        mongoStaff = { _id: res.insertedId, ...insert };
      }

      if (mongoStaff) {
        const id = (mongoStaff as { _id?: ObjectId })._id?.toString();
        const dbName = (mongoStaff as { name?: string }).name ?? name;
        if (id) {
          staffIdToMongoId.set(name.toLowerCase(), id);
          staffIdToMongoId.set(name, id);
          staffIdToName.set(id, dbName);
        }
        if (staffId && id) staffIdToMongoId.set(staffId, id);
      }
    }
    console.log(`   ✓ ${trainerKeys.size} trainers ensured\n`);

    // 3. Create/ensure members
    console.log("👤 Creating/updating members...");
    const memberIds = new Set<string>();
    for (const row of validRows) {
      const id = toNum(row.idmember);
      const name = row.Name?.trim();
      if (isNaN(id) || !name) continue;
      const memberNum = String(Math.floor(id));
      if (memberIds.has(memberNum)) continue;
      memberIds.add(memberNum);

      const existing = await membersCol.findOne({
        $or: [{ memberNumber: memberNum }, { customerNumber: memberNum }],
      } as any);

      if (!existing) {
        const salesDate = row["Sales Date"];
        const dateJoined = toDateStr(salesDate) || toDateStr(row["Start Date"]) || new Date().toISOString().split("T")[0];
        await membersCol.insertOne({
          memberNumber: memberNum,
          customerNumber: memberNum,
          fullName: name,
          email: `member${memberNum}@import.placeholder`,
          phone: "",
          company: "",
          totalSpent: 0,
          status: "active",
          dateJoined,
          lastPurchase: dateJoined,
          location: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }
    }
    console.log(`   ✓ ${memberIds.size} members ensured\n`);

    // 4. Create PT package records
    console.log("📋 Creating PT package records...");
    let inserted = 0;
    let skipped = 0;

    for (const row of validRows) {
      const memberNum = String(Math.floor(toNum(row.idmember)));
      const memberName = row.Name!.trim();
      const ptPackageName = row["PT Packages"]?.trim() || `PT - ${toNum(row["Total Sessions"])} Sessions`;
      const sessions = toNum(row["Total Sessions"]);
      const usedSessions = toNum(row["Used Sessions"]);
      const remainingSessions = toNum(row["Remaining Sessions"]);
      const pkg = existingBySessions.get(sessions);
      const ptPackageId = pkg?.id || existingBySessions.get(sessions)?.id || "";
      const invoiceNumber = String(Math.floor(toNum(row["Invoice No"])));
      const startDate = toDateStr(row["Start Date"]);
      const expiryDate = toDateStr(row["Expiration Date"]);
      const paymentDate = toDateStr(row["Sales Date"]) || startDate;
      const amount = parseAmount(row.Amount);
      const ptContract = row["PT Contract"] != null ? String(row["PT Contract"]).trim() : undefined;
      const ptName = row["PT Associated"]!.trim();
      const staffIdRaw = row.STAFFID;
      const staffIdStr = staffIdRaw != null && !isNaN(toNum(staffIdRaw)) ? String(Math.floor(toNum(staffIdRaw))) : "";
      const mongoId = staffIdStr
        ? staffIdToMongoId.get(staffIdStr) || staffIdToMongoId.get(ptName) || staffIdToMongoId.get(ptName.toLowerCase())
        : staffIdToMongoId.get(ptName) || staffIdToMongoId.get(ptName.toLowerCase());
      const assignedStaffId = mongoId || undefined;
      const assignedStaffName = mongoId ? (staffIdToName.get(mongoId) ?? ptName) : ptName;
      const issuedBy = row["Issued By : "]?.trim() || undefined;

      // Unique key: memberId + invoiceNumber (one invoice = one package)
      const existingRecord = await ptPackagesCol.findOne({
        memberId: memberNum,
        invoiceNumber,
      } as any);

      if (existingRecord && !replaceMode) {
        skipped++;
        continue;
      }

      await ptPackagesCol.insertOne({
        memberId: memberNum,
        memberName,
        ptPackageId: ptPackageId || `pt-import-${sessions}`,
        ptPackageName,
        ptPackageSessions: sessions,
        invoiceNumber,
        startDate,
        expiryDate,
        paymentType: "other",
        paymentDate,
        amount,
        assignedStaffName,
        assignedStaffId,
        issuedBy,
        ...(usedSessions >= 0 && !isNaN(usedSessions) && { usedSessions }),
        ...(remainingSessions >= 0 && !isNaN(remainingSessions) && { remainingSessions }),
        ...(ptContract && { ptContract }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      inserted++;
    }

    console.log(`   ✓ Inserted ${inserted} PT package records`);
    if (skipped > 0) console.log(`   ⏭️  Skipped ${skipped} (already exist)\n`);

    // Summary by trainer
    const byTrainer = new Map<string, number>();
    for (const row of validRows) {
      const name = row["PT Associated"]?.trim() || "Unknown";
      byTrainer.set(name, (byTrainer.get(name) || 0) + 1);
    }

    console.log("📊 Clients per trainer:");
    for (const [trainer, count] of [...byTrainer.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${trainer}: ${count} packages`);
    }

    console.log("\n✅ Import complete!");
  } catch (err) {
    console.error("❌ Import failed:", err);
    throw err;
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
