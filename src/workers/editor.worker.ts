/// <reference lib="webworker" />
import { serveJobs } from "@/editor/workers/job-runner";

/** Background thread for CPU-heavy editor jobs (ADR-0012). No DOM, no network. */
serveJobs(self as unknown as DedicatedWorkerGlobalScope);
