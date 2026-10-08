import { rootMetadata, rootViewport } from "@/lib/seo/root-metadata";
import "../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;

/**
 * Root layout of the editor. The website has its own root layout, so navigating between them
 * is always a full page load: the editor gets its strict security policy and never shares a
 * JavaScript context with ad code from website pages (ADR-0013).
 */
export default function EditorLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
