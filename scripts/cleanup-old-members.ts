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

async function cleanupOldMembers() {
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
    const membersCollection = db.collection("members");

    // Find all members with old ID format (starting with "member-")
    const oldMembers = await membersCollection.find({
      id: { $regex: /^member-\d+$/ }
    }).toArray();

    console.log(`📊 Found ${oldMembers.length} member(s) with old ID format\n`);

    if (oldMembers.length === 0) {
      console.log("✅ No old members to clean up!");
      return;
    }

    // Show what will be deleted
    console.log("📋 Members to be deleted:");
    oldMembers.forEach((member, index) => {
      console.log(`   ${index + 1}. ID: ${member.id}, Name: ${member.fullName || member.name || 'N/A'}, Member Number: ${member.memberNumber || member.customerNumber || 'N/A'}`);
    });

    // Delete all old members
    console.log("\n🗑️  Deleting old members...");
    const result = await membersCollection.deleteMany({
      id: { $regex: /^member-\d+$/ }
    });

    console.log(`✅ Deleted ${result.deletedCount} member(s) with old ID format`);

    // Also delete any members that don't have a proper memberNumber
    const membersWithoutMemberNumber = await membersCollection.find({
      $or: [
        { memberNumber: { $exists: false } },
        { memberNumber: null },
        { memberNumber: "" }
      ],
      customerNumber: { $exists: false }
    }).toArray();

    if (membersWithoutMemberNumber.length > 0) {
      console.log(`\n📊 Found ${membersWithoutMemberNumber.length} member(s) without memberNumber`);
      const result2 = await membersCollection.deleteMany({
        $or: [
          { memberNumber: { $exists: false } },
          { memberNumber: null },
          { memberNumber: "" }
        ],
        customerNumber: { $exists: false }
      });
      console.log(`✅ Deleted ${result2.deletedCount} member(s) without memberNumber`);
    }

    // Verify remaining members
    const remainingCount = await membersCollection.countDocuments();
    console.log(`\n📊 Remaining members in database: ${remainingCount}`);

    console.log("\n✅ Cleanup completed successfully!");

  } catch (error) {
    console.error("❌ Error cleaning up old members:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the cleanup
cleanupOldMembers()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  });

