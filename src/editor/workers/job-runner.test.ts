import { describe, expect, it } from "vitest";
import { FormatError } from "../formats/binary/bytes";
import { mainThreadRunner, serveJobs, workerRunner } from "./job-runner";

type Listener = (event: MessageEvent) => void;

/** An in-memory worker: messages are structured-cloned and answered by `serveJobs`. */
function fakeWorker() {
  const toWorker: Listener[] = [];
  const toMain: Listener[] = [];
  const errors: ((e: Event) => void)[] = [];
  serveJobs({
    addEventListener: (_type, l) => toWorker.push(l),
    postMessage: (message) =>
      queueMicrotask(() =>
        toMain.forEach((l) => l({ data: structuredClone(message) } as MessageEvent)),
      ),
  });
  return {
    worker: {
      postMessage: (message: unknown) =>
        queueMicrotask(() =>
          toWorker.forEach((l) => l({ data: structuredClone(message) } as MessageEvent)),
        ),
      addEventListener: (type: string, l: never) =>
        type === "message" ? toMain.push(l) : errors.push(l),
      terminate() {},
    },
    crash: () => errors.forEach((e) => e(new Event("error"))),
  };
}

const pixels = {
  width: 3,
  height: 1,
  data: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9, 255]),
};

describe("job runner", () => {
  it("runs jobs inline and through a worker with the same result", async () => {
    const input = { pixels, x: 0, y: 0, tolerance: 0, contiguous: true };
    const inline = await mainThreadRunner.run("flood", input);
    const { worker } = fakeWorker();
    const viaWorker = await workerRunner(() => worker).run("flood", input);
    expect(viaWorker.bounds).toEqual(inline.bounds);
    expect(Array.from(viaWorker.data)).toEqual([255, 255, 0]);
  });

  it("keeps user-facing format errors across the boundary", async () => {
    const { worker } = fakeWorker();
    await expect(
      workerRunner(() => worker).run("psdRead", new TextEncoder().encode("nope, not a psd")),
    ).rejects.toBeInstanceOf(FormatError);
  });

  it("falls back to the main thread when the worker cannot start or crashes", async () => {
    const broken = workerRunner(() => {
      throw new Error("no workers here");
    });
    const result = await broken.run("colorRange", { pixels, color: [9, 9, 9, 255], fuzziness: 0 });
    expect(Array.from(result.data)).toEqual([0, 0, 255]);

    const silent = {
      postMessage() {},
      addEventListener: (type: string, l: (e: Event) => void) => {
        if (type === "error") queueMicrotask(() => l(new Event("error")));
      },
      terminate() {},
    };
    const crashed = await workerRunner(() => silent as never).run("flood", {
      pixels,
      x: 2,
      y: 0,
      tolerance: 0,
      contiguous: true,
    });
    expect(Array.from(crashed.data)).toEqual([0, 0, 255]);
  });
});
