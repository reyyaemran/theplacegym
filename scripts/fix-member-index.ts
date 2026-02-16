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

async function fixMemberIndex() {
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

    // Get all existing indexes
    const indexes = await membersCollection.indexes();
    console.log("📋 Current indexes:");
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop the old customerNumber unique index if it exists
    try {
      await membersCollection.dropIndex("customerNumber_1");
      console.log("\n✅ Dropped old customerNumber_1 index");
    } catch (error: any) {
      if (error.codeName === "IndexNotFound") {
        console.log("\n⚠️  customerNumber_1 index not found (may have been already dropped)");
      } else {
        throw error;
      }
    }

    // Create new indexes with sparse option to allow null values
    console.log("\n📝 Creating new indexes...");
    
    // Create memberNumber index (unique, sparse)
    try {
      await membersCollection.createIndex({ memberNumber: 1 }, { unique: true, sparse: true });
      console.log("   ✅ Created memberNumber unique index (sparse)");
    } catch (error: any) {
      if (error.code === 85) {
        console.log("   ⚠️  memberNumber index already exists");
      } else {
        throw error;
      }
    }

    // Create customerNumber index (unique, sparse) for backward compatibility
    try {
      await membersCollection.createIndex({ customerNumber: 1 }, { unique: true, sparse: true });
      console.log("   ✅ Created customerNumber unique index (sparse)");
    } catch (error: any) {
      if (error.code === 85) {
        console.log("   ⚠️  customerNumber index already exists");
      } else {
        throw error;
      }
    }

    // Update existing members to set customerNumber = memberNumber if missing
    console.log("\n🔄 Updating existing members...");
    const membersToUpdate = await membersCollection.find({
      $or: [
        { customerNumber: { $exists: false } },
        { customerNumber: null }
      ],
      memberNumber: { $exists: true, $ne: null }
    }).toArray();

    let updateCount = 0;
    for (const member of membersToUpdate) {
      await membersCollection.updateOne(
        { _id: member._id },
        { $set: { customerNumber: member.memberNumber } }
      );
      updateCount++;
    }
    console.log(`   ✅ Updated ${updateCount} member(s) to set customerNumber = memberNumber`);

    // Also update members where memberNumber exists but customerNumber doesn't match
    const membersToSync = await membersCollection.find({
      memberNumber: { $exists: true, $ne: null }
    }).toArray();

    let syncCount = 0;
    for (const member of membersToSync) {
      if (member.memberNumber && member.memberNumber !== member.customerNumber) {
        await membersCollection.updateOne(
          { _id: member._id },
          { $set: { customerNumber: member.memberNumber } }
        );
        syncCount++;
      }
    }
    console.log(`   ✅ Updated ${syncCount} member(s) to sync customerNumber with memberNumber`);

    // Verify indexes
    console.log("\n📋 Updated indexes:");
    const updatedIndexes = await membersCollection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false}, sparse: ${index.sparse || false})`);
    });

    console.log("\n✅ Index fix completed successfully!");

  } catch (error) {
    console.error("❌ Error fixing member index:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the fix
fixMemberIndex()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  });

