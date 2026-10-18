import {
  fromJobError,
  JOBS,
  outputTransfer,
  toJobError,
  type JobError,
  type JobInput,
  type JobName,
  type JobOutput,
} from "./jobs";

/** Runs CPU-heavy jobs off the UI thread when it can (ADR-0012). */
export interface JobRunner {
  run<K extends JobName>(
    name: K,
    input: JobInput<K>,
    transfer?: Transferable[],
  ): Promise<JobOutput<K>>;
  dispose(): void;
  /** True while jobs run in a worker, so drawing jobs (ADR-0022) are worth sending there. */
  readonly offThread?: boolean;
}

/** Runs jobs inline. Used in tests and when workers are unavailable. */
export const mainThreadRunner: JobRunner = {
  offThread: false,
  async run(name, input) {
    return (await JOBS[name](input as never)) as never;
  },
  dispose() {},
};

type Reply = { id: number; ok: true; output: unknown } | { id: number; ok: false; error: JobError };

interface WorkerLike {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<Reply>) => void): void;
  addEventListener(type: "error", listener: (event: Event) => void): void;
  terminate(): void;
}

/**
 * A runner backed by one worker. If the worker fails to start or crashes, pending and later jobs
 * fall back to the main thread, so features keep working (just less smoothly).
 */
export function workerRunner(create: () => WorkerLike): JobRunner {
  let worker: WorkerLike | null = null;
  let broken = false;
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; retry: () => void }
  >();

  const fail = () => {
    broken = true;
    worker?.terminate();
    worker = null;
    for (const job of pending.values()) job.retry();
    pending.clear();
  };

  const ensure = (): WorkerLike | null => {
    if (broken) return null;
    if (worker) return worker;
    try {
      worker = create();
      worker.addEventListener("message", (event) => {
        const reply = event.data;
        const job = pending.get(reply.id);
        if (!job) return;
        pending.delete(reply.id);
        if (reply.ok) job.resolve(reply.output);
        else job.reject(fromJobError(reply.error));
      });
      worker.addEventListener("error", fail);
      return worker;
    } catch {
      broken = true;
      return null;
    }
  };

  return {
    get offThread() {
      return !broken;
    },
    run(name, input, transfer = []) {
      const w = ensure();
      if (!w) return mainThreadRunner.run(name, input);
      return new Promise((resolve, reject) => {
        const id = nextId++;
        const retry = () => mainThreadRunner.run(name, input).then(resolve, reject);
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, retry });
        try {
          w.postMessage({ id, name, input }, transfer);
        } catch {
          pending.delete(id);
          retry();
        }
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      for (const job of pending.values()) job.reject(new Error("The editor was closed."));
      pending.clear();
    },
  };
}

/** The worker side: answer job requests. */
export function serveJobs(scope: {
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  postMessage(message: unknown, transfer: Transferable[]): void;
}): void {
  scope.addEventListener("message", async (event: MessageEvent) => {
    const { id, name, input } = event.data as { id: number; name: JobName; input: unknown };
    try {
      if (!Object.hasOwn(JOBS, name)) throw new Error("Unknown job.");
      const output = await JOBS[name](input as never);
      scope.postMessage({ id, ok: true, output }, outputTransfer(name, output));
    } catch (error) {
      scope.postMessage({ id, ok: false, error: toJobError(error) }, []);
    }
  });
}
