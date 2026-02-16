import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";

// Load environment variables
dotenv.config({ path: join(process.cwd(), ".env.local") });

const uri: string = process.env.MONGODB_URI || "";

if (!uri) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

async function clearPackageRecords() {
  let client: MongoClient | null = null;

  try {
    console.log("🔌 Connecting to MongoDB...");
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    });

    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("theplace");
    const membershipsCollection = db.collection("memberships");
    const ptPackagesCollection = db.collection("pt-packages");

    // Count existing records
    const membershipCount = await membershipsCollection.countDocuments();
    const ptPackageCount = await ptPackagesCollection.countDocuments();

    console.log("📊 Current records:");
    console.log(`   - Membership records: ${membershipCount}`);
    console.log(`   - PT Package records: ${ptPackageCount}\n`);

    if (membershipCount === 0 && ptPackageCount === 0) {
      console.log("✅ No records to clear. Database is already clean!");
      return;
    }

    // Clear membership records
    console.log("🗑️  Clearing membership records...");
    const membershipResult = await membershipsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${membershipResult.deletedCount} membership record(s)`);

    // Clear PT package records
    console.log("🗑️  Clearing PT package records...");
    const ptPackageResult = await ptPackagesCollection.deleteMany({});
    console.log(`   ✅ Deleted ${ptPackageResult.deletedCount} PT package record(s)`);

    console.log("\n✅ Package records cleared successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Membership records deleted: ${membershipResult.deletedCount}`);
    console.log(`   - PT Package records deleted: ${ptPackageResult.deletedCount}`);
    console.log("\n🚀 Database is now clean and ready for fresh data!");

  } catch (error) {
    console.error("❌ Error clearing package records:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the clear
clearPackageRecords()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Clear failed:", error);
    process.exit(1);
  });

