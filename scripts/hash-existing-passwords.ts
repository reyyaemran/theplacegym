/**
 * One-shot migration: hash any plaintext passwords still in the `staff`
 * collection. Safe to re-run — rows already in scrypt format are skipped.
 *
 * Usage: npx tsx scripts/hash-existing-passwords.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";
import { hashPassword, isHashed } from "../src/lib/password";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = "theplace";

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const collection = db.collection("staff");
    const all = await collection
      .find({ password: { $exists: true, $ne: null } } as any)
      .toArray();

    let upgraded = 0;
    let skipped = 0;

    for (const doc of all) {
      const password = (doc as any).password as string | undefined;
      if (!password) {
        skipped++;
        continue;
      }
      if (isHashed(password)) {
        skipped++;
        continue;
      }
      const hashed = hashPassword(password);
      await collection.updateOne(
        { _id: doc._id },
        { $set: { password: hashed, updatedAt: new Date() } }
      );
      upgraded++;
      console.log(`  ✓ ${doc.email || doc.staffID || doc._id}`);
    }

    console.log(`\n✅ Done. Upgraded: ${upgraded}. Skipped (already hashed or empty): ${skipped}.`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
