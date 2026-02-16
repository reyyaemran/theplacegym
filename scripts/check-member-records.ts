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

async function checkMemberRecords() {
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
    const membershipsCollection = db.collection("memberships");
    const ptPackagesCollection = db.collection("pt-packages");

    // Get all members
    const members = await membersCollection.find({}).limit(5).toArray();
    console.log(`📊 Found ${await membersCollection.countDocuments()} total members`);
    console.log(`   Showing first 5 members:\n`);

    for (const member of members) {
      const memberNumber = member.memberNumber || member.customerNumber;
      const memberName = member.fullName;
      
      console.log(`👤 Member: ${memberName}`);
      console.log(`   Member Number: ${memberNumber}`);
      console.log(`   Member ID: ${member._id || member.id}`);

      // Find membership records
      const membershipRecords = await membershipsCollection.find({
        $or: [
          { memberId: memberNumber },
          { memberName: memberName }
        ]
      }).toArray();

      console.log(`   📋 Membership Records: ${membershipRecords.length}`);
      membershipRecords.forEach((record, idx) => {
        console.log(`      ${idx + 1}. Member ID: "${record.memberId}", Name: "${record.memberName}", Type: ${record.membershipType}`);
      });

      // Find PT package records
      const ptPackageRecords = await ptPackagesCollection.find({
        $or: [
          { memberId: memberNumber },
          { memberName: memberName }
        ]
      }).toArray();

      console.log(`   💪 PT Package Records: ${ptPackageRecords.length}`);
      ptPackageRecords.forEach((record, idx) => {
        console.log(`      ${idx + 1}. Member ID: "${record.memberId}", Name: "${record.memberName}", Package: ${record.ptPackageName}`);
      });

      console.log("");
    }

    // Check for orphaned records
    console.log("\n🔍 Checking for orphaned records (records without matching members)...");
    
    const allMembershipRecords = await membershipsCollection.find({}).toArray();
    const allPTPackageRecords = await ptPackagesCollection.find({}).toArray();
    
    const allMemberNumbers = new Set(
      (await membersCollection.find({}).toArray()).map(m => m.memberNumber || m.customerNumber).filter(Boolean)
    );
    const allMemberNames = new Set(
      (await membersCollection.find({}).toArray()).map(m => m.fullName).filter(Boolean)
    );

    const orphanedMemberships = allMembershipRecords.filter(r => 
      !allMemberNumbers.has(r.memberId) && !allMemberNames.has(r.memberName)
    );
    const orphanedPTPackages = allPTPackageRecords.filter(r => 
      !allMemberNumbers.has(r.memberId) && !allMemberNames.has(r.memberName)
    );

    console.log(`   Orphaned Membership Records: ${orphanedMemberships.length}`);
    if (orphanedMemberships.length > 0) {
      orphanedMemberships.slice(0, 3).forEach(r => {
        console.log(`      - Member ID: "${r.memberId}", Name: "${r.memberName}"`);
      });
    }

    console.log(`   Orphaned PT Package Records: ${orphanedPTPackages.length}`);
    if (orphanedPTPackages.length > 0) {
      orphanedPTPackages.slice(0, 3).forEach(r => {
        console.log(`      - Member ID: "${r.memberId}", Name: "${r.memberName}"`);
      });
    }

  } catch (error) {
    console.error("❌ Error checking member records:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the check
checkMemberRecords()
  .then(() => {
    console.log("\n✅ Check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });

