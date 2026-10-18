import { describe, expect, it } from "vitest";
import {
  HOUSE_AD,
  isSafeImage,
  isSafeTarget,
  pickSponsorship,
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
