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

  it("rotates daily, the same for everyone", () => {
    const ads = [ad("a"), ad("b", { placement: ["site-sidebar", "blog-inline"] })];
    const day = (n: number) => n;
    expect(pickSponsorship(ads, "site-sidebar", day(10)).id).toBe("a");
    expect(pickSponsorship(ads, "site-sidebar", day(11)).id).toBe("b");
    expect(pickSponsorship(ads, "blog-inline", day(10)).id).toBe("b");
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

  it("rotates the first slot daily and never shows more than the slots", () => {
    const ads = [side("a"), side("b"), side("c"), side("d")];
    expect(pickSponsorships(ads, "editor-side", 0, 3).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(pickSponsorships(ads, "editor-side", 1, 3).map((p) => p.id)).toEqual(["b", "c", "d"]);
    expect(pickSponsorships(ads, "editor-side", 3, 3).map((p) => p.id)).toEqual(["d", "a", "b"]);
  });

  it("accepts only self-hosted MP4 or WebM videos", () => {
    expect(isSafeVideo("/sponsors/focuscrew.mp4")).toBe(true);
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
    // Two bookings take turns in the first slot; the third is a house ad.
    const today = pickSponsorships(SPONSORSHIPS, "editor-side", 0, 3).map((ad) => ad.id);
    expect(today).toEqual(["focuscrew", "wikidigit", HOUSE_ADS[0].id]);
    const tomorrow = pickSponsorships(SPONSORSHIPS, "editor-side", 1, 3).map((ad) => ad.id);
    expect(tomorrow).toEqual(["wikidigit", "focuscrew", HOUSE_ADS[0].id]);
  });
});
