import { Redis } from "ioredis";

/** BullMQ requires maxRetriesPerRequest: null on ioredis. */
export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not set.");
  }
  return new Redis(url, {
    maxRetriesPerRequest: null,
  });
}

export function isAsyncAnalysisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim()) &&
    process.env.USE_ASYNC_ANALYSIS !== "false";
}
