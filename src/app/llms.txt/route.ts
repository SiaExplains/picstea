import { llmsTxt } from "@/lib/seo/llms";

/** /llms.txt: a Markdown summary of Picstea for AI assistants (llmstxt.org). */
export function GET(): Response {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
