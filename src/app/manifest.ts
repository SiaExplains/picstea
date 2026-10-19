import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — free online photo editor`,
    short_name: SITE.name,
    description: SITE.description,
    // Installable app (ADR-0029): the editor opens in its own window and works offline.
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    categories: ["photo", "graphics", "productivity"],
    prefer_related_applications: false,
    background_color: "#1e1f22",
    theme_color: "#1e1f22",
    // "any", not "maskable": the artwork reaches the edges and would be cropped by a mask.
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
