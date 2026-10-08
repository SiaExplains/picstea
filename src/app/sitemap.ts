import type { MetadataRoute } from "next";
import { publicRoutes } from "@/lib/seo/routes";
import { absoluteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes().map((route) => ({
    url: absoluteUrl(route.path),
    priority: route.priority,
    ...(route.lastModified ? { lastModified: route.lastModified } : {}),
  }));
}
