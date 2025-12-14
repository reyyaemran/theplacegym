import { MongoClient, Db, MongoClientOptions } from "mongodb";

const uri: string = process.env.MONGODB_URI || "";

// MongoDB connection options with SSL/TLS configuration for Atlas
const options: MongoClientOptions = {
  // Enable SSL/TLS for Atlas connections (required for mongodb+srv://)
  // The tls option is automatically enabled for mongodb+srv:// URIs
  // Set server selection timeout (how long to wait for server selection)
  serverSelectionTimeoutMS: 10000,
  // Set socket timeout (how long to wait for socket operations)
  socketTimeoutMS: 45000,
  // Connection pool options
  maxPoolSize: 10,
  minPoolSize: 1,
  // Retry writes
  retryWrites: true,
  // Retry reads
  retryReads: true,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Please add it to .env.local");
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

// Export a function that returns the client promise
// This allows lazy initialization and proper error handling
export default getClientPromise;

export async function getDatabase(dbName: string = "theplace"): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Please add it to .env.local");
  }
  const client = await getClientPromise();
  return client.db(dbName);
}

