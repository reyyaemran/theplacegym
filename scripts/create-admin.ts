/**
 * Create or update the default admin staff account.
 *
 * Usage: npx tsx scripts/create-admin.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";
import { DEFAULT_PERMISSIONS_BY_DEPARTMENT } from "../src/types/staff";
import { hashPassword } from "../src/lib/password";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = "theplace";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@theplacepp.com").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Theplace2026";
const ADMIN_NAME = process.env.ADMIN_NAME || "The Place Admin";

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const now = new Date();
    const staffID = `ADM-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const staffDoc = {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      department: "CM",
      status: "AVAILABLE",
      hireDate: now,
      staffID,
      password: hashPassword(ADMIN_PASSWORD),
      loginEnabled: true,
      role: "ADMIN",
      permissions: DEFAULT_PERMISSIONS_BY_DEPARTMENT["CM"] || [],
      shift: "AM",
      updatedAt: now,
    };

    const existing = await db.collection("staff").findOne({ email: ADMIN_EMAIL });

    if (existing) {
      await db.collection("staff").updateOne(
        { email: ADMIN_EMAIL },
        { $set: staffDoc }
      );
      console.log(`✅ Updated admin: ${ADMIN_EMAIL}`);
    } else {
      await db.collection("staff").insertOne({ ...staffDoc, createdAt: now });
      console.log(`✅ Created admin: ${ADMIN_EMAIL}`);
    }

    console.log("\n── Login ──────────────────────────────────────────");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   URL:      http://localhost:3000/login`);
    console.log("──────────────────────────────────────────────────\n");
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
