import { describe, expect, it } from "vitest";
import { createDocument } from "../document/factory";
import type { EditorDocument } from "../document/types";
import {
  canRedo,
  canUndo,
  collapseSince,
  createHistory,
  dropOldest,
  jumpTo,
  MERGE_WINDOW_MS,
  recordChange,
  redo,
  sealHistory,
  undo,
  undoLabel,
} from "./history";

const docs = Array.from({ length: 5 }, (_, i) =>
  createDocument({ name: `v${i}`, width: 1, height: 1 }),
) as EditorDocument[];

describe("history", () => {
  it("undoes and redoes in order", () => {
    let h = createHistory();
    h = recordChange(h, { label: "one", before: docs[0], after: docs[1] }, 0);
    h = recordChange(h, { label: "two", before: docs[1], after: docs[2] }, 5000);
    expect(undoLabel(h)).toBe("two");

    const u1 = undo(h)!;
    expect(u1.document).toBe(docs[1]);
    const u2 = undo(u1.state)!;
    expect(u2.document).toBe(docs[0]);
    expect(canUndo(u2.state)).toBe(false);
    expect(undo(u2.state)).toBeNull();

    const r1 = redo(u2.state)!;
    expect(r1.document).toBe(docs[1]);
    expect(canRedo(r1.state)).toBe(true);
  });

  it("clears the redo stack on a new change", () => {
    let h = createHistory();
    h = recordChange(h, { label: "one", before: docs[0], after: docs[1] }, 0);
    h = undo(h)!.state;
    h = recordChange(h, { label: "branch", before: docs[0], after: docs[3] }, 10);
    expect(canRedo(h)).toBe(false);
  });

  it("merges consecutive changes with the same key inside the window", () => {
    let h = createHistory();
    h = recordChange(h, { label: "opacity", before: docs[0], after: docs[1], mergeKey: "k" }, 0);
    h = recordChange(h, { label: "opacity", before: docs[1], after: docs[2], mergeKey: "k" }, 100);
    expect(h.past).toHaveLength(1);
    expect(h.past[0].before).toBe(docs[0]);
    expect(h.past[0].after).toBe(docs[2]);

    h = recordChange(
      h,
      { label: "opacity", before: docs[2], after: docs[3], mergeKey: "k" },
      100 + MERGE_WINDOW_MS + 1,
    );
    expect(h.past).toHaveLength(2);
  });

  it("does not merge across a seal or a different key", () => {
    let h = createHistory();
    h = recordChange(h, { label: "a", before: docs[0], after: docs[1], mergeKey: "k" }, 0);
    h = sealHistory(h);
    h = recordChange(h, { label: "a", before: docs[1], after: docs[2], mergeKey: "k" }, 10);
    h = recordChange(h, { label: "b", before: docs[2], after: docs[3], mergeKey: "other" }, 20);
    expect(h.past).toHaveLength(3);
  });

  it("drops the oldest entries beyond the limit", () => {
    let h = createHistory(2);
    for (let i = 0; i < 4; i++) {
      h = recordChange(h, { label: `c${i}`, before: docs[i], after: docs[i + 1] }, i * 5000);
    }
    expect(h.past.map((e) => e.label)).toEqual(["c2", "c3"]);
  });

  it("rejects invalid limits", () => {
    expect(() => createHistory(0)).toThrow(RangeError);
  });

  describe("jumpTo", () => {
    const build = () => {
      let h = createHistory();
      for (let i = 0; i < 4; i++) {
        h = recordChange(h, { label: `s${i}`, before: docs[i], after: docs[i + 1] }, i * 5000);
      }
      return h;
    };

    it("moves back and forward to any step", () => {
      const back = jumpTo(build(), 1)!;
      expect(back.document).toBe(docs[1]);
      expect(back.state.past.map((e) => e.label)).toEqual(["s0"]);
      expect(back.state.future.map((e) => e.label)).toEqual(["s1", "s2", "s3"]);
      const start = jumpTo(back.state, 0)!;
      expect(start.document).toBe(docs[0]);
      const forward = jumpTo(start.state, 3)!;
      expect(forward.document).toBe(docs[3]);
      expect(forward.state.future.map((e) => e.label)).toEqual(["s3"]);
    });

    it("rejects the current step and out-of-range targets", () => {
      const h = build();
      expect(jumpTo(h, 4)).toBeNull();
      expect(jumpTo(h, 5)).toBeNull();
      expect(jumpTo(h, -1)).toBeNull();
      expect(jumpTo(h, 1.5)).toBeNull();
    });
  });

  describe("collapseSince", () => {
    it("folds the steps since a document into one", () => {
      let h = createHistory();
      for (let i = 0; i < 4; i++) {
        h = recordChange(h, { label: `s${i}`, before: docs[i], after: docs[i + 1] }, i * 5000);
      }
      const c = collapseSince(h, docs[1], "Action: Test");
      expect(c.past.map((e) => e.label)).toEqual(["s0", "Action: Test"]);
      const u = undo(c)!;
      expect(u.document).toBe(docs[1]);
    });

    it("leaves history alone when the start was trimmed", () => {
      let h = createHistory();
      for (let i = 0; i < 3; i++) {
        h = recordChange(h, { label: `s${i}`, before: docs[i], after: docs[i + 1] }, i * 5000);
      }
      const trimmed = dropOldest(h, 1);
      expect(collapseSince(trimmed, docs[0], "x")).toBe(trimmed);
    });
  });
});
