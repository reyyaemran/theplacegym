/**
 * Database Seed Script
 * 
 * This script seeds the database with initial test data for development/testing.
 * 
 * Usage: npx tsx scripts/seed-database.ts
 * 
 * Make sure to set MONGODB_URI in .env.local before running
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";
import { mockStaff } from "../src/lib/mock-data";
import { mockMembers } from "../src/features/dashboard/pages/members/data/mock-members";
import { mockAppointments } from "../src/lib/mock-data";
import { mockPTPackageRecords } from "../src/features/dashboard/pages/ptpackage-invoice/data/mock-pt-package-records";
import { mockMembershipRecords } from "../src/features/dashboard/pages/membership-invoice/data/mock-membership-records";

// Load environment variables
dotenv.config({ path: join(process.cwd(), ".env.local") });

const MONGODB_URI: string = process.env.MONGODB_URI || "";
const DB_NAME = "theplace";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Seed Staff
    console.log("\n👥 Seeding staff...");
    const staffCollection = db.collection("staff");
    const existingStaff = await staffCollection.countDocuments();
    
    if (existingStaff === 0) {
      // Convert mock staff to MongoDB format
      const staffToInsert = mockStaff.map((staff) => ({
        ...staff,
        _id: staff._id,
      }));
      
      await staffCollection.insertMany(staffToInsert as any);
      console.log(`   ✓ Inserted ${mockStaff.length} staff members`);
    } else {
      console.log(`   ⏭️  Staff collection already has ${existingStaff} documents, skipping`);
    }

    // Seed Members
    console.log("\n👤 Seeding members...");
    const membersCollection = db.collection("members");
    const existingMembers = await membersCollection.countDocuments();
    
    if (existingMembers === 0) {
      // Convert mock members to MongoDB format and insert one by one to handle duplicates
      let inserted = 0;
      let skipped = 0;
      
      for (const member of mockMembers) {
        try {
          await membersCollection.insertOne({
            ...member,
            _id: member.id,
          } as any);
          inserted++;
        } catch (error: any) {
          if (error.code === 11000) {
            // Duplicate key error - skip
            skipped++;
          } else {
            throw error;
          }
        }
      }
      
      console.log(`   ✓ Inserted ${inserted} members`);
      if (skipped > 0) {
        console.log(`   ⏭️  Skipped ${skipped} duplicate members`);
      }
    } else {
      console.log(`   ⏭️  Members collection already has ${existingMembers} documents, skipping`);
    }

    // Seed Appointments
    console.log("\n📅 Seeding appointments...");
    const appointmentsCollection = db.collection("appointments");
    const existingAppointments = await appointmentsCollection.countDocuments();
    
    if (existingAppointments === 0) {
      // Convert mock appointments to MongoDB format and insert one by one
      let inserted = 0;
      let skipped = 0;
      
      for (const apt of mockAppointments) {
        try {
          await appointmentsCollection.insertOne({
            ...apt,
            _id: apt._id,
            date: typeof apt.date === "string" ? apt.date : apt.date.toISOString(),
            createdAt: apt.createdAt ? (typeof apt.createdAt === "string" ? apt.createdAt : apt.createdAt.toISOString()) : new Date().toISOString(),
            updatedAt: apt.updatedAt ? (typeof apt.updatedAt === "string" ? apt.updatedAt : apt.updatedAt.toISOString()) : new Date().toISOString(),
          } as any);
          inserted++;
        } catch (error: any) {
          if (error.code === 11000) {
            // Duplicate key error - skip
            skipped++;
          } else {
            throw error;
          }
        }
      }
      
      console.log(`   ✓ Inserted ${inserted} appointments`);
      if (skipped > 0) {
        console.log(`   ⏭️  Skipped ${skipped} duplicate appointments`);
      }
    } else {
      console.log(`   ⏭️  Appointments collection already has ${existingAppointments} documents, skipping`);
    }

    console.log("\n✅ Database seeding complete!");
    // Seed PT Package Records
    console.log("\n📦 Seeding PT package records...");
    const ptPackagesCollection = db.collection("pt-packages");
    const existingPTPackages = await ptPackagesCollection.countDocuments();
    
    if (existingPTPackages === 0) {
      let inserted = 0;
      let skipped = 0;
      
      for (const record of mockPTPackageRecords) {
        try {
          await ptPackagesCollection.insertOne({
            ...record,
            _id: record.id,
          } as any);
          inserted++;
        } catch (error: any) {
          if (error.code === 11000) {
            skipped++;
          } else {
            throw error;
          }
        }
      }
      
      console.log(`   ✓ Inserted ${inserted} PT package records`);
      if (skipped > 0) {
        console.log(`   ⏭️  Skipped ${skipped} duplicate PT package records`);
      }
    } else {
      console.log(`   ⏭️  PT packages collection already has ${existingPTPackages} documents, skipping`);
    }

    // Seed Membership Records
    console.log("\n💳 Seeding membership records...");
    const membershipsCollection = db.collection("memberships");
    const existingMemberships = await membershipsCollection.countDocuments();
    
    if (existingMemberships === 0) {
      let inserted = 0;
      let skipped = 0;
      
      for (const record of mockMembershipRecords) {
        try {
          await membershipsCollection.insertOne({
            ...record,
            _id: record.id,
          } as any);
          inserted++;
        } catch (error: any) {
          if (error.code === 11000) {
            skipped++;
          } else {
            throw error;
          }
        }
      }
      
      console.log(`   ✓ Inserted ${inserted} membership records`);
      if (skipped > 0) {
        console.log(`   ⏭️  Skipped ${skipped} duplicate membership records`);
      }
    } else {
      console.log(`   ⏭️  Memberships collection already has ${existingMemberships} documents, skipping`);
    }

    console.log("\n📋 Summary:");
    console.log(`   - Staff: ${await staffCollection.countDocuments()} documents`);
    console.log(`   - Members: ${await membersCollection.countDocuments()} documents`);
    console.log(`   - Appointments: ${await appointmentsCollection.countDocuments()} documents`);
    console.log(`   - PT Packages: ${await ptPackagesCollection.countDocuments()} documents`);
    console.log(`   - Memberships: ${await membershipsCollection.countDocuments()} documents`);
    console.log("\n🚀 You can now see real data in your app!");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Failed to seed database:", error);
    process.exit(1);
  });

