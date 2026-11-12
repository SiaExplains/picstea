import { describe, expect, it } from "vitest";
import { isBoxMesh, warpMap } from "../../core/geometry/mesh";
import { placedDistortion } from "./psd-convert";

const corners = [0, 0, 200, 0, 200, 100, 0, 100];

describe("PSD smart objects with perspective or warp (ADR-0044)", () => {
  it("keeps perspective corners as an editable distortion", () => {
    const d = placedDistortion(
      { id: "a", corners, perspective: [10, 0, 190, 20, 200, 100, 0, 100] },
      200,
      100,
    );
    expect(d).toEqual({ kind: "perspective", corners: [10, 0, 190, 20, 200, 100, 0, 100] });
  });

  it("turns a preset warp into its mesh, and a custom mesh into content pixels", () => {
    const arc = placedDistortion(
      { id: "a", corners, warp: { style: "arc", bend: 0.5, horizontal: 0, vertical: 0 } },
      200,
      100,
    );
    expect(arc?.kind).toBe("warp");
    if (arc?.kind !== "warp") return;
    expect(isBoxMesh(arc.mesh, 200, 100)).toBe(false);
    expect(warpMap(arc.mesh)(0.5, 0).y).toBeLessThan(0);

    const unit: number[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) unit.push(j / 3, i / 3);
    const custom = placedDistortion(
      {
        id: "a",
        corners,
        warp: { style: "custom", bend: 0, horizontal: 0, vertical: 0, mesh: unit },
      },
      200,
      100,
    );
    expect(custom?.kind === "warp" && isBoxMesh(custom.mesh, 200, 100)).toBe(true);
    expect(placedDistortion({ id: "a", corners }, 200, 100)).toBeUndefined();
  });
});
