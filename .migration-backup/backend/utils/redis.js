// utils/redis.js
import { createClient } from "redis";

// The Upstash URL carries the password. It was committed here in plain text,
// so it is in every clone and every fork of this repository's history and must
// be treated as disclosed: ROTATE THE CREDENTIAL, then set REDIS_URL.
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error(
    "REDIS_URL must be set. The connection string was previously hardcoded in " +
      "this file; that credential is compromised and must be rotated."
  );
}

const redisClient = createClient({ url: redisUrl });

redisClient.on("error", (err) => console.error("Redis Error:", err));
redisClient.on("connect", () => console.log("Redis connected 🔥"));

// Connect once and export the client
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Redis connection established ✅");
    } catch (err) {
      console.error("Redis connection failed:", err);
    }
  }
};

export default redisClient;