/**
 * Create MongoDB indexes for better query performance
 * Run with: npx tsx scripts/create-indexes.ts
 * 
 * This script is idempotent - safe to run multiple times.
 * It will skip indexes that already exist.
 */

import { MongoClient, Collection, IndexSpecification, CreateIndexesOptions } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// Helper function to safely create an index (skips if exists)
async function safeCreateIndex(
  collection: Collection,
  indexSpec: IndexSpecification,
  options?: CreateIndexesOptions,
  description?: string
): Promise<boolean> {
  try {
    await collection.createIndex(indexSpec, options);
    console.log(`  ✓ ${description || JSON.stringify(indexSpec)}`);
    return true;
  } catch (error: unknown) {
    const mongoError = error as { code?: number; codeName?: string };
    // Code 86 = IndexKeySpecsConflict (index already exists with different options)
    // Code 85 = IndexOptionsConflict
    if (mongoError.code === 86 || mongoError.code === 85) {
      console.log(`  ⏭ ${description || JSON.stringify(indexSpec)} (already exists, skipping)`);
      return false;
    }
    throw error;
  }
}

async function createIndexes() {
  const uri = MONGODB_URI!;
  const client = new MongoClient(uri);

  let created = 0;
  let skipped = 0;

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("theplace");

    // Appointments collection indexes
    console.log("\n📋 Creating indexes for 'appointments' collection...");
    const appointmentsCollection = db.collection("appointments");
    
    if (await safeCreateIndex(appointmentsCollection, { date: -1, time: 1 }, {}, "date + time (for date-based queries)")) created++; else skipped++;
    if (await safeCreateIndex(appointmentsCollection, { staffId: 1, date: -1 }, {}, "staffId + date (for trainer schedules)")) created++; else skipped++;
    if (await safeCreateIndex(appointmentsCollection, { clientId: 1, date: -1 }, {}, "clientId + date (for member history)")) created++; else skipped++;
    if (await safeCreateIndex(appointmentsCollection, { status: 1, date: -1 }, {}, "status + date (for filtering by status)")) created++; else skipped++;
    if (await safeCreateIndex(appointmentsCollection, { appointmentNumber: 1 }, { unique: true }, "appointmentNumber (unique)")) created++; else skipped++;

    // Members collection indexes
    console.log("\n👥 Creating indexes for 'members' collection...");
    const membersCollection = db.collection("members");
    
    // Note: Using sparse: true to match existing index
    if (await safeCreateIndex(membersCollection, { customerNumber: 1 }, { unique: true, sparse: true }, "customerNumber (unique, sparse)")) created++; else skipped++;
    if (await safeCreateIndex(membersCollection, { fullName: "text", phone: "text", email: "text" }, {}, "fulltext search on name, phone, email")) created++; else skipped++;
    if (await safeCreateIndex(membersCollection, { createdAt: -1 }, {}, "createdAt (for recent members)")) created++; else skipped++;

    // Staff collection indexes
    console.log("\n👤 Creating indexes for 'staff' collection...");
    const staffCollection = db.collection("staff");
    
    if (await safeCreateIndex(staffCollection, { staffID: 1 }, { unique: true, sparse: true }, "staffID (unique, sparse)")) created++; else skipped++;
    if (await safeCreateIndex(staffCollection, { email: 1 }, { unique: true, sparse: true }, "email (unique, sparse)")) created++; else skipped++;
    if (await safeCreateIndex(staffCollection, { department: 1, status: 1 }, {}, "department + status (for filtering)")) created++; else skipped++;

    // Membership records indexes
    console.log("\n💳 Creating indexes for 'memberships' collection...");
    const membershipsCollection = db.collection("memberships");
    
    if (await safeCreateIndex(membershipsCollection, { memberId: 1, startDate: -1 }, {}, "memberId + startDate")) created++; else skipped++;
    if (await safeCreateIndex(membershipsCollection, { status: 1, endDate: 1 }, {}, "status + endDate (for expiration checks)")) created++; else skipped++;

    // PT Package records indexes
    console.log("\n🏋️ Creating indexes for 'pt-packages' collection...");
    const ptPackagesCollection = db.collection("pt-packages");
    
    if (await safeCreateIndex(ptPackagesCollection, { memberId: 1, purchaseDate: -1 }, {}, "memberId + purchaseDate")) created++; else skipped++;
    if (await safeCreateIndex(ptPackagesCollection, { trainerId: 1, status: 1 }, {}, "trainerId + status")) created++; else skipped++;

    // Roster collection indexes
    console.log("\n📅 Creating indexes for 'roster' collection...");
    const rosterCollection = db.collection("roster");
    
    if (await safeCreateIndex(rosterCollection, { staffId: 1, date: 1 }, { unique: true }, "staffId + date (unique)")) created++; else skipped++;
    if (await safeCreateIndex(rosterCollection, { date: 1, status: 1 }, {}, "date + status")) created++; else skipped++;

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Complete! Created: ${created}, Skipped: ${skipped}`);
    console.log("=".repeat(50));
    
    console.log("\n📊 Index Statistics:");
    const collections = ["appointments", "members", "staff", "memberships", "pt-packages", "roster"];
    for (const collName of collections) {
      try {
        const indexes = await db.collection(collName).indexes();
        console.log(`  ${collName}: ${indexes.length} indexes`);
      } catch {
        console.log(`  ${collName}: (collection not found)`);
      }
    }

  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

createIndexes();
