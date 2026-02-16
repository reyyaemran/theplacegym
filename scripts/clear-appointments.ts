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

async function clearAppointments() {
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
    const collection = db.collection("appointments");

    // Count existing appointments
    const countBefore = await collection.countDocuments();
    console.log(`📊 Found ${countBefore} appointment(s) in the database`);

    if (countBefore === 0) {
      console.log("ℹ️  No appointments to clear. Database is already empty.");
      return;
    }

    // Delete all appointments
    const result = await collection.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} appointment(s)`);

    // Verify deletion
    const countAfter = await collection.countDocuments();
    console.log(`✅ Verification: ${countAfter} appointment(s) remaining`);

    if (countAfter === 0) {
      console.log("✨ Successfully cleared all appointments from the database!");
    } else {
      console.warn(`⚠️  Warning: ${countAfter} appointment(s) still remain in the database`);
    }
  } catch (error) {
    console.error("❌ Error clearing appointments:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 Disconnected from MongoDB");
    }
  }
}

// Run the script
clearAppointments()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

