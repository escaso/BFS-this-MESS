import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URI;
if (!url) {
  throw new Error("MONGODB_URI is not set. Add it to your .env file.");
}

export const client = new MongoClient(url);
export const db = client.db();