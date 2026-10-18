import { describe, expect, it } from "vitest";
import { adsTxt, parseAdsenseClient, parseAdsenseCmp } from "./adsense";

describe("AdSense configuration", () => {
  it("builds the ads.txt line from the publisher ID", () => {
    expect(adsTxt("ca-pub-1234567890123456")).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("only accepts real publisher IDs", () => {
    expect(parseAdsenseClient(" ca-pub-1234567890123456 ")).toBe("ca-pub-1234567890123456");
    expect(parseAdsenseClient("pub-1234567890123456")).toBeNull();
    expect(parseAdsenseClient("ca-pub-123\nevil")).toBeNull();
    expect(parseAdsenseClient(undefined)).toBeNull();
  });

  it("uses Google's CMP only when explicitly asked", () => {
    expect(parseAdsenseCmp("google")).toBe("google");
    expect(parseAdsenseCmp(" Google ")).toBe("google");
    expect(parseAdsenseCmp("own")).toBe("own");
    expect(parseAdsenseCmp("")).toBe("own");
    expect(parseAdsenseCmp(undefined)).toBe("own");
    expect(parseAdsenseCmp("yes")).toBe("own");
  });
});
