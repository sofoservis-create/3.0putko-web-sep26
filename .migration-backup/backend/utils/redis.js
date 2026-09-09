// utils/redis.js
import { createClient } from "redis";

const redisClient = createClient({
  url: "rediss://default:AfKLAAIncDJlNGE0NmUwZjc1Nzk0ZjRkYTU4OTI5NWYyMDQzMzc4MHAyNjIwOTE@classic-filly-62091.upstash.io:6379"
});

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