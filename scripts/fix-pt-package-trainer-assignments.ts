/**
 * Fix PT package records: ensure assignedStaffId is set by matching staff by name.
 * Handles name typos/variations (e.g. "Seryroth" vs "Seryoth").
 * Run this after import if trainers see wrong/missing client data.
 *
 * Usage: npx tsx scripts/fix-pt-package-trainer-assignments.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = "theplace";

/** Levenshtein distance - for fuzzy name matching (typos like Seryroth/Seryoth) */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Check if names match (exact or within 1 edit - typo) */
function namesPlausiblyMatch(pkgName: string, staffName: string): boolean {
  const p = pkgName.trim().toLowerCase().replace(/\s+/g, " ");
  const s = staffName.trim().toLowerCase().replace(/\s+/g, " ");
  if (p === s) return true;
  return levenshtein(p, s) <= 1;
}

async function run() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not set");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const ptPackagesCol = db.collection("pt-packages");
    const staffCol = db.collection("staff");

    const staffList = await staffCol.find({ department: { $in: ["PT", "PTS"] } }).toArray();
    const nameToStaff = new Map<string, { _id: string; name: string }>();
    for (const s of staffList) {
      const id = (s as { _id?: unknown })._id?.toString();
      const name = (s as { name?: string }).name?.trim();
      if (id && name) {
        nameToStaff.set(name.toLowerCase(), { _id: id, name });
        nameToStaff.set(name, { _id: id, name });
      }
    }

    const packages = await ptPackagesCol
      .find({ assignedStaffName: { $exists: true, $ne: "" } })
      .toArray();

    let updated = 0;
    let skipped = 0;
    let noMatch = 0;

    for (const pkg of packages) {
      const p = pkg as { assignedStaffName?: string; assignedStaffId?: string };
      const pkgName = p.assignedStaffName?.trim();
      if (!pkgName) continue;

      let staff = nameToStaff.get(pkgName) || nameToStaff.get(pkgName.toLowerCase());
      if (!staff) {
        // Fuzzy match: find staff whose name plausibly matches (handles typos like Seryroth/Seryoth)
        const found = staffList.find((s) =>
          namesPlausiblyMatch(pkgName, (s as { name?: string }).name ?? "")
        ) as { _id?: unknown; name?: string } | undefined;
        if (found) {
          staff = { _id: found._id?.toString() ?? "", name: found.name ?? "" };
        }
      }

      if (!staff || !staff._id) {
        noMatch++;
        continue;
      }

      const currentId = p.assignedStaffId;
      const expectedId = staff._id;
      if (currentId === expectedId) {
        skipped++;
        continue;
      }

      await ptPackagesCol.updateOne(
        { _id: (pkg as { _id?: import("mongodb").ObjectId })._id },
        {
          $set: {
            assignedStaffId: expectedId,
            assignedStaffName: staff.name,
            updatedAt: new Date().toISOString(),
          },
        }
      );
      updated++;
    }

    console.log("✅ Done.");
    console.log(`   Updated: ${updated}`);
    console.log(`   Already correct: ${skipped}`);
    console.log(`   No staff match: ${noMatch}`);
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
