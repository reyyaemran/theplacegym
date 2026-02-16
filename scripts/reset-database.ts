/**
 * Database Reset Script
 * 
 * This script resets the entire database and keeps only the super admin user.
 * 
 * Usage: npx tsx scripts/reset-database.ts
 * 
 * Make sure to set MONGODB_URI in .env.local before running
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI: string = process.env.MONGODB_URI || "";
const DB_NAME = "theplace";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// Super Admin user data
const SUPER_ADMIN = {
  email: process.env.ADMIN_EMAIL || "theplaceadmin@theplace.com.kh",
  password: process.env.ADMIN_PASSWORD || "admin123", // In production, set ADMIN_PASSWORD env var
  name: "Super Admin",
  role: "SUPERADMIN",
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function resetDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Get all collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    console.log(`\n🗑️  Dropping ${collectionNames.length} collections...`);
    for (const collectionName of collectionNames) {
      await db.collection(collectionName).drop();
      console.log(`   ✓ Dropped collection: ${collectionName}`);
    }

    // Create super admin in users collection
    console.log("\n👤 Creating super admin user...");
    const usersCollection = db.collection("users");
    await usersCollection.insertOne(SUPER_ADMIN);
    console.log("   ✓ Super admin created");

    // Create indexes for better performance
    console.log("\n📊 Creating indexes...");
    
    // Users collection indexes
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log("   ✓ Created index on users.email");

    // Staff collection indexes (for future use)
    const staffCollection = db.collection("staff");
    await staffCollection.createIndex({ email: 1 }, { unique: true });
    await staffCollection.createIndex({ staffID: 1 }, { unique: true });
    console.log("   ✓ Created indexes on staff collection");

    // Members collection indexes
    const membersCollection = db.collection("members");
    // Create index on memberNumber (primary) and customerNumber (for backward compatibility)
    await membersCollection.createIndex({ memberNumber: 1 }, { unique: true, sparse: true });
    await membersCollection.createIndex({ customerNumber: 1 }, { unique: true, sparse: true });
    await membersCollection.createIndex({ email: 1 });
    await membersCollection.createIndex({ phone: 1 });
    console.log("   ✓ Created indexes on members collection");

    // Appointments collection indexes
    const appointmentsCollection = db.collection("appointments");
    await appointmentsCollection.createIndex({ clientId: 1 });
    await appointmentsCollection.createIndex({ staffId: 1 });
    await appointmentsCollection.createIndex({ date: 1 });
    console.log("   ✓ Created indexes on appointments collection");

    console.log("\n✅ Database reset complete!");
    console.log("\n📋 Summary:");
    console.log(`   - Database: ${DB_NAME}`);
    console.log(`   - Collections dropped: ${collectionNames.length}`);
    console.log(`   - Super admin email: ${SUPER_ADMIN.email}`);
    console.log(`   - Super admin password: ${SUPER_ADMIN.password}`);
    console.log("\n🚀 You can now start testing from A to Z!");

  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Failed to reset database:", error);
    process.exit(1);
  });

