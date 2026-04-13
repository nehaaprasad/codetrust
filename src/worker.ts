import "dotenv/config";
import { Worker } from "bullmq";
import { createRedisConnection } from "@/lib/queue/redisConnection";
import { processAnalyzeJob } from "@/lib/queue/processAnalyzeJob";
import type { AnalyzeJobData } from "@/lib/queue/jobTypes";

const QUEUE_NAME = "analyze";

const connection = createRedisConnection();

const worker = new Worker<AnalyzeJobData>(
  QUEUE_NAME,
  async (job) => {
    return processAnalyzeJob(job);
  },
  {
    connection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed`, err);
});

console.log("[worker] listening on queue", QUEUE_NAME);
