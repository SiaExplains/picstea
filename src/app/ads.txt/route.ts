import { ADSENSE_CLIENT, adsTxt } from "@/lib/ads/adsense";

/** /ads.txt (IAB) authorising Google AdSense; 404 until a publisher ID is configured. */
export function GET(): Response {
  if (!ADSENSE_CLIENT) return new Response("Not found", { status: 404 });
  return new Response(adsTxt(ADSENSE_CLIENT), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
