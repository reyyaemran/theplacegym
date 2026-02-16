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

async function cleanupOldInvoiceRecords() {
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

    // Find membership records with old invoice format (INV-M-YYYY-XXXX or INV-PT-YYYY-XXXX)
    const oldMembershipRecords = await membershipsCollection.find({
      invoiceNumber: { $regex: /^INV-M-\d{4}-/ }
    }).toArray();

    // Find PT package records with old invoice format
    const oldPTPackageRecords = await ptPackagesCollection.find({
      invoiceNumber: { $regex: /^INV-PT-\d{4}-/ }
    }).toArray();

    console.log(`📊 Found ${oldMembershipRecords.length} membership record(s) with old invoice format`);
    console.log(`📊 Found ${oldPTPackageRecords.length} PT package record(s) with old invoice format\n`);

    if (oldMembershipRecords.length === 0 && oldPTPackageRecords.length === 0) {
      console.log("✅ No old invoice records to clean up!");
      return;
    }

    // Show what will be deleted
    if (oldMembershipRecords.length > 0) {
      console.log("📋 Membership records to be deleted:");
      oldMembershipRecords.slice(0, 10).forEach((record, index) => {
        console.log(`   ${index + 1}. Invoice: ${record.invoiceNumber}, Member: ${record.memberName || record.memberId || 'N/A'}, Type: ${record.membershipType || 'N/A'}`);
      });
      if (oldMembershipRecords.length > 10) {
        console.log(`   ... and ${oldMembershipRecords.length - 10} more`);
      }
      console.log("");
    }

    if (oldPTPackageRecords.length > 0) {
      console.log("📋 PT Package records to be deleted:");
      oldPTPackageRecords.slice(0, 10).forEach((record, index) => {
        console.log(`   ${index + 1}. Invoice: ${record.invoiceNumber}, Member: ${record.memberName || record.memberId || 'N/A'}, Package: ${record.ptPackageName || 'N/A'}`);
      });
      if (oldPTPackageRecords.length > 10) {
        console.log(`   ... and ${oldPTPackageRecords.length - 10} more`);
      }
      console.log("");
    }

    // Delete old membership records
    let membershipResult = { deletedCount: 0 };
    if (oldMembershipRecords.length > 0) {
      console.log("🗑️  Deleting old membership records...");
      membershipResult = await membershipsCollection.deleteMany({
        invoiceNumber: { $regex: /^INV-M-\d{4}-/ }
      });
      console.log(`   ✅ Deleted ${membershipResult.deletedCount} membership record(s)`);
    }

    // Delete old PT package records
    let ptPackageResult = { deletedCount: 0 };
    if (oldPTPackageRecords.length > 0) {
      console.log("🗑️  Deleting old PT package records...");
      ptPackageResult = await ptPackagesCollection.deleteMany({
        invoiceNumber: { $regex: /^INV-PT-\d{4}-/ }
      });
      console.log(`   ✅ Deleted ${ptPackageResult.deletedCount} PT package record(s)`);
    }

    // Verify remaining records
    const remainingMemberships = await membershipsCollection.countDocuments();
    const remainingPTPackages = await ptPackagesCollection.countDocuments();
    
    console.log("\n📊 Remaining records in database:");
    console.log(`   - Membership records: ${remainingMemberships}`);
    console.log(`   - PT Package records: ${remainingPTPackages}`);

    console.log("\n✅ Cleanup completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Membership records deleted: ${membershipResult.deletedCount}`);
    console.log(`   - PT Package records deleted: ${ptPackageResult.deletedCount}`);
    console.log(`   - Total deleted: ${membershipResult.deletedCount + ptPackageResult.deletedCount}`);

  } catch (error) {
    console.error("❌ Error cleaning up old invoice records:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the cleanup
cleanupOldInvoiceRecords()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  });

