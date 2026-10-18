import { describe, expect, it } from "vitest";
import { AssetStore } from "../assets/asset-store";
import { createDocument } from "../core/document/factory";
import { estimateTextSizer } from "../rendering/text/text-layout";
import { createSelection } from "../selection/mask";
import type { JobRunner } from "./job-runner";
import { ColorRangeSession } from "./offthread";

/** A worker stand-in that logs jobs; `hold` keeps image-sending jobs waiting until released. */
function fakeWorker() {
  const log: string[] = [];
  let kept: string | null = null;
  const waiting: (() => void)[] = [];
  let hold = false;
  const mask = () => createSelection(1, 1, new Uint8Array(1));
  const jobs: JobRunner = {
    offThread: true,
    async run(name, input) {
      const i = input as { key?: string; source?: unknown };
      log.push(i?.source ? `${name}+image` : name);
      if (name === "colorRangeRelease") {
        kept = null;
        return null as never;
      }
      if (i.source) {
        if (hold) await new Promise<void>((resolve) => waiting.push(resolve));
        kept = i.key!;
      } else if (kept !== i.key) {
        const error = new Error("gone");
        error.name = "CacheMissError";
        throw error;
      }
      return mask() as never;
    },
    dispose() {},
  };
  return {
    jobs,
    log,
    kept: () => kept,
    hold(on: boolean) {
      hold = on;
      if (!on) waiting.splice(0).forEach((resolve) => resolve());
    },
  };
}

function session(jobs: JobRunner) {
  const env = {
    jobs,
    assets: new AssetStore(() => Promise.reject(new Error("no"))),
    sizer: estimateTextSizer,
    createSurface: () => {
      throw new Error("not used");
    },
  };
  return new ColorRangeSession(env, () => null);
}

const doc = createDocument({
  name: "Range",
  width: 4,
  height: 4,
  background: { kind: "transparent" },
});
const black = [0, 0, 0, 255] as const;

describe("Color Range sessions in the worker", () => {
  it("send the image once; later steps only send the colour test", async () => {
    const worker = fakeWorker();
    const s = session(worker.jobs);
    await s.preview(doc, undefined, black, 10);
    await s.preview(doc, undefined, black, 20);
    await s.preview(doc, undefined, black, 30);
    expect(worker.log).toEqual([
      "colorRangeDocument+image",
      "colorRangeDocument",
      "colorRangeDocument",
    ]);
    s.end();
    expect(worker.kept()).toBeNull();
  });

  it("don't send the image twice for steps made while it is on its way", async () => {
    const worker = fakeWorker();
    const s = session(worker.jobs);
    worker.hold(true);
    const first = s.preview(doc, undefined, black, 10);
    const second = s.preview(doc, undefined, black, 20);
    await Promise.resolve();
    worker.hold(false);
    await Promise.all([first, second]);
    expect(worker.log.filter((j) => j.endsWith("+image"))).toHaveLength(1);
  });

  it("free the worker's copy when the dialog closes while the image is on its way", async () => {
    const worker = fakeWorker();
    const s = session(worker.jobs);
    worker.hold(true);
    const pending = s.preview(doc, undefined, black, 10);
    await Promise.resolve();
    s.end();
    worker.hold(false);
    await pending;
    expect(worker.log.at(-1)).toBe("colorRangeRelease");
    expect(worker.kept()).toBeNull();
  });

  it("send the image again when the worker lost it", async () => {
    const worker = fakeWorker();
    const s = session(worker.jobs);
    await s.preview(doc, undefined, black, 10);
    await worker.jobs.run("colorRangeRelease", null);
    await s.preview(doc, undefined, black, 20);
    expect(worker.log.filter((j) => j.endsWith("+image"))).toHaveLength(2);
  });
});
