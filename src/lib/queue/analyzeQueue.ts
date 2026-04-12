import { Queue } from "bullmq";
import { createRedisConnection } from "./redisConnection";
import type { AnalyzeJobData } from "./jobTypes";

const QUEUE_NAME = "analyze";

let queue: Queue<AnalyzeJobData> | null = null;

export function getAnalyzeQueue(): Queue<AnalyzeJobData> {
  if (!queue) {
    queue = new Queue<AnalyzeJobData>(QUEUE_NAME, {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

export async function addAnalyzeJob(data: AnalyzeJobData) {
  const q = getAnalyzeQueue();
  return q.add("run", data, {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 50 },
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}
