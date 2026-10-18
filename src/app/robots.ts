import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Search engines and AI assistants are welcome everywhere (docs/10 "AEO"). The AI crawlers are
 * named explicitly so their access doesn't depend on how each one reads the "*" group: search and
 * answer crawlers (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot) and
 * training crawlers or opt-outs (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended).
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: [...AI_CRAWLERS], allow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
