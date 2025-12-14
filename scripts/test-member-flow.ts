import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { join } from "path";

// Load environment variables
dotenv.config({ path: join(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

async function testMemberFlow() {
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
    console.log("✅ Connected to MongoDB");

    const db = client.db("theplace");
    const membersCollection = db.collection("members");
    const membershipsCollection = db.collection("memberships");
    const ptPackagesCollection = db.collection("pt-packages");

    // Create a test member
    const testMemberNumber = `00000${Math.floor(100000000 + Math.random() * 900000000)}`.slice(-9);
    const testMember = {
      memberNumber: testMemberNumber,
      fullName: "Test Member",
      email: "test@example.com",
      phone: "+855123456789",
      company: "",
      totalSpent: 0,
      status: "active",
      dateJoined: new Date().toISOString(),
      lastPurchase: new Date().toISOString(),
      location: "Phnom Penh",
    };

    console.log("\n📝 Creating test member...");
    const memberResult = await membersCollection.insertOne(testMember as any);
    const memberId = memberResult.insertedId.toString();
    console.log(`✅ Member created with ID: ${memberId}`);
    console.log(`   Member Number: ${testMemberNumber}`);

    // Get a membership type (1 month)
    const membershipTypesCollection = db.collection("membership-types");
    const membershipType = await membershipTypesCollection.findOne({ type: "1_month" });
    
    if (!membershipType) {
      console.log("⚠️  No 1_month membership type found, creating test membership record without type...");
    }

    // Create membership record
    const membershipRecord = {
      memberId: testMemberNumber,
      memberName: testMember.fullName,
      membershipType: "1_month",
      invoiceNumber: `INV-M-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      paymentType: "cash",
      paymentDate: new Date().toISOString(),
      amount: membershipType?.price || 50,
      issuedBy: "System",
    };

    console.log("\n📝 Creating membership record...");
    const membershipResult = await membershipsCollection.insertOne(membershipRecord as any);
    console.log(`✅ Membership record created with ID: ${membershipResult.insertedId.toString()}`);
    console.log(`   Member ID in record: ${membershipRecord.memberId}`);
    console.log(`   Member Name in record: ${membershipRecord.memberName}`);

    // Get a PT package type (10 sessions)
    const ptPackageTypesCollection = db.collection("pt-package-types");
    const ptPackageType = await ptPackageTypesCollection.findOne({ sessions: 10 });
    
    if (!ptPackageType) {
      console.log("⚠️  No 10-session PT package type found, creating test PT package record without type...");
    }

    // Create PT package record
    const ptPackageRecord = {
      memberId: testMemberNumber,
      memberName: testMember.fullName,
      ptPackageId: ptPackageType?.id || "test-pt-package-id",
      ptPackageName: ptPackageType?.name || "10 Sessions",
      ptPackageSessions: ptPackageType?.sessions || 10,
      invoiceNumber: `INV-PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      paymentType: "cash",
      paymentDate: new Date().toISOString(),
      amount: ptPackageType?.price || 200,
      issuedBy: "System",
    };

    console.log("\n📝 Creating PT package record...");
    const ptPackageResult = await ptPackagesCollection.insertOne(ptPackageRecord as any);
    console.log(`✅ PT package record created with ID: ${ptPackageResult.insertedId.toString()}`);
    console.log(`   Member ID in record: ${ptPackageRecord.memberId}`);
    console.log(`   Member Name in record: ${ptPackageRecord.memberName}`);

    // Verify records can be found
    console.log("\n🔍 Verifying records...");
    
    const foundMembership = await membershipsCollection.findOne({ memberId: testMemberNumber });
    const foundPTPackage = await ptPackagesCollection.findOne({ memberId: testMemberNumber });
    const foundMember = await membersCollection.findOne({ memberNumber: testMemberNumber });

    console.log("\n📊 Verification Results:");
    console.log(`   Member found: ${foundMember ? "✅" : "❌"}`);
    if (foundMember) {
      console.log(`   - Member Number: ${foundMember.memberNumber}`);
      console.log(`   - Full Name: ${foundMember.fullName}`);
    }
    
    console.log(`   Membership record found: ${foundMembership ? "✅" : "❌"}`);
    if (foundMembership) {
      console.log(`   - Member ID: ${foundMembership.memberId}`);
      console.log(`   - Member Name: ${foundMembership.memberName}`);
      console.log(`   - Membership Type: ${foundMembership.membershipType}`);
    }
    
    console.log(`   PT Package record found: ${foundPTPackage ? "✅" : "❌"}`);
    if (foundPTPackage) {
      console.log(`   - Member ID: ${foundPTPackage.memberId}`);
      console.log(`   - Member Name: ${foundPTPackage.memberName}`);
      console.log(`   - PT Package: ${foundPTPackage.ptPackageName}`);
    }

    // Check if records match by memberNumber
    console.log("\n🔗 Linking Verification:");
    if (foundMember && foundMembership) {
      const membershipMatches = foundMembership.memberId === foundMember.memberNumber || 
                                foundMembership.memberName === foundMember.fullName;
      console.log(`   Membership record links to member: ${membershipMatches ? "✅" : "❌"}`);
      if (!membershipMatches) {
        console.log(`   ⚠️  Mismatch - Member Number: ${foundMember.memberNumber}, Record Member ID: ${foundMembership.memberId}`);
      }
    }

    if (foundMember && foundPTPackage) {
      const ptPackageMatches = foundPTPackage.memberId === foundMember.memberNumber || 
                               foundPTPackage.memberName === foundMember.fullName;
      console.log(`   PT Package record links to member: ${ptPackageMatches ? "✅" : "❌"}`);
      if (!ptPackageMatches) {
        console.log(`   ⚠️  Mismatch - Member Number: ${foundMember.memberNumber}, Record Member ID: ${foundPTPackage.memberId}`);
      }
    }

    console.log("\n✨ Test Summary:");
    console.log(`   Test Member Number: ${testMemberNumber}`);
    console.log(`   Member Name: ${testMember.fullName}`);
    console.log(`   View in app: http://localhost:3000/dashboard/members/${testMemberNumber}`);

  } catch (error) {
    console.error("❌ Error testing member flow:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the test
testMemberFlow()
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

