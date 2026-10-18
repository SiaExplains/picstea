import { llmsFullTxt } from "@/lib/seo/llms";

/** /llms-full.txt: every documentation page as plain Markdown, for AI assistants. */
export function GET(): Response {
  return new Response(llmsFullTxt(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
