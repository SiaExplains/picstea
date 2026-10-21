import { describe, expect, it } from "vitest";
import { SPONSORSHIPS } from "@/content/sponsorships";
import {
  HOUSE_AD,
  HOUSE_ADS,
  isSafeImage,
  isSafeTarget,
  isSafeVideo,
  pickSponsorship,
  pickSponsorships,
  type Advertisement,
} from "./sponsorship";

const ad = (id: string, extra: Partial<Advertisement> = {}): Advertisement => ({
  id,
  sponsor: id,
  title: id,
  targetUrl: "https://example.com",
  placement: "site-sidebar",
  active: true,
  ...extra,
});

describe("sponsorships", () => {
  it("falls back to the house ad when nothing is booked", () => {
    expect(pickSponsorship([], "editor-start", 0)).toBe(HOUSE_AD);
    expect(pickSponsorship([ad("a", { active: false })], "site-sidebar", 0)).toBe(HOUSE_AD);
    expect(pickSponsorship([ad("a")], "editor-start", 0)).toBe(HOUSE_AD);
  });

  it("picks one at random per page view, only from its placement", () => {
    const ads = [ad("a"), ad("b", { placement: ["site-sidebar", "blog-inline"] })];
    expect(pickSponsorship(ads, "site-sidebar", 0).id).toBe("a");
    expect(pickSponsorship(ads, "blog-inline", 12345).id).toBe("b");
    const seen = new Set(
      Array.from({ length: 50 }, (_, i) => pickSponsorship(ads, "site-sidebar", i + 1).id),
    );
    expect(seen).toEqual(new Set(["a", "b"]));
  });

  it("never renders unsafe links or third-party images", () => {
    expect(isSafeTarget("javascript:alert(1)")).toBe(false);
    expect(isSafeTarget("http://example.com")).toBe(false);
    expect(isSafeTarget("//evil.example")).toBe(false);
    expect(isSafeTarget("/\\evil.example")).toBe(false);
    expect(isSafeTarget("/\t/evil.example")).toBe(false);
    expect(isSafeTarget("https://example.com/a b")).toBe(false);
    expect(isSafeTarget("/sponsorship")).toBe(true);
    expect(isSafeImage("https://tracker.example/pixel.gif")).toBe(false);
    expect(isSafeImage("/sponsors/../secret.png")).toBe(false);
    expect(isSafeImage("/sponsors/acme.webp")).toBe(true);
    expect(
      pickSponsorship([ad("x", { targetUrl: "javascript:alert(1)" })], "site-sidebar", 0),
    ).toBe(HOUSE_AD);
  });
});

describe("several slots (ADR-0034)", () => {
  const side = (id: string, extra: Partial<Advertisement> = {}) =>
    ad(id, { placement: "editor-side", ...extra });

  it("fills three slots: booked first, then distinct house ads", () => {
    const picked = pickSponsorships([side("a")], "editor-side", 0, 3);
    expect(picked.map((p) => p.id)).toEqual(["a", HOUSE_ADS[0].id, HOUSE_ADS[1].id]);
    expect(pickSponsorships([], "editor-side", 0, 3).map((p) => p.id)).toEqual(
      HOUSE_ADS.map((h) => h.id),
    );
  });

  it("shows 3 of 4 at random, in random positions, fairly", () => {
    const ads = [side("a"), side("b"), side("c"), side("d")];
    // Seed 0 (prerendering) is the listed order.
    expect(pickSponsorships(ads, "editor-side", 0, 3).map((p) => p.id)).toEqual(["a", "b", "c"]);
    const views = 8000;
    const shown = new Map<string, number>();
    const inSlot = new Map<string, number>();
    for (let seed = 1; seed <= views; seed++) {
      const ids = pickSponsorships(ads, "editor-side", (seed * 2654435761) >>> 0, 3).map(
        (p) => p.id,
      );
      expect(new Set(ids).size).toBe(3);
      ids.forEach((id, slot) => {
        shown.set(id, (shown.get(id) ?? 0) + 1);
        inSlot.set(`${id}@${slot}`, (inSlot.get(`${id}@${slot}`) ?? 0) + 1);
      });
    }
    // Each sponsor in about 3/4 of views, and in each slot about 1/4 of the time.
    for (const id of ["a", "b", "c", "d"]) {
      expect(shown.get(id)! / views).toBeCloseTo(0.75, 1);
      for (const slot of [0, 1, 2]) {
        expect(inSlot.get(`${id}@${slot}`)! / views).toBeCloseTo(0.25, 1);
      }
    }
    // The same seed gives the same choice, so every slot on a page agrees.
    expect(pickSponsorships(ads, "editor-side", 42, 3)).toEqual(
      pickSponsorships(ads, "editor-side", 42, 3),
    );
  });

  it("accepts only self-hosted MP4 or WebM videos", () => {
    expect(isSafeVideo("/sponsors/focuscrew-tabs.mp4")).toBe(true);
    expect(isSafeVideo("https://cdn.example.com/a.mp4")).toBe(false);
    expect(isSafeVideo("/sponsors/../secret.mp4")).toBe(false);
    expect(isSafeVideo("/sponsors/a.mov")).toBe(false);
    // Protocol-relative paths point at another site.
    expect(isSafeVideo("//evil.example/x.mp4")).toBe(false);
    expect(isSafeImage("//evil.example/x.png")).toBe(false);
    const bad = side("v", { video: "https://evil.example/x.mp4" });
    expect(pickSponsorships([bad], "editor-side", 0, 1)[0].id).toBe(HOUSE_ADS[0].id);
  });

  it("the booked sponsorships are all valid", () => {
    for (const booked of SPONSORSHIPS) {
      expect(isSafeTarget(booked.targetUrl)).toBe(true);
      expect(isSafeImage(booked.image)).toBe(true);
      expect(isSafeVideo(booked.video)).toBe(true);
    }
    // Four bookings for three slots: every view shows three different sponsors and no house ad.
    expect(SPONSORSHIPS.map((s) => s.id)).toEqual(["focuscrew", "emojar", "wikidigit", "goallai"]);
    for (const seed of [0, 1, 7, 99, 123456]) {
      const ids = pickSponsorships(SPONSORSHIPS, "editor-side", seed, 3).map((ad) => ad.id);
      expect(new Set(ids).size).toBe(3);
      expect(ids.every((id) => !id.startsWith("house"))).toBe(true);
    }
  });
});
