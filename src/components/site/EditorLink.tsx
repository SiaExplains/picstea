import Link from "next/link";
import { localizedPath } from "@/i18n/locales";
import { currentLocale } from "@/i18n/server";
import type { ReactNode } from "react";

/**
 * A link from a website page to the editor (`/`). The editor has its own root layout, so this is
 * always a full page load: the editor starts with its strict security policy and without any ad
 * code a website page may have loaded (ADR-0013). Not prefetched, so content pages don't
 * download the editor bundle. Keeps the visitor's language: `/de` or `/de?convert=…`.
 */
export async function EditorLink({
  href = "/",
  className,
  children,
  "aria-label": ariaLabel,
}: {
  /** `/` or `/?convert=<id>` (converter pages); always the editor. */
  href?: `/` | `/?${string}`;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const locale = await currentLocale();
  const [path, query] = href.split("?");
  const target = localizedPath(path, locale) + (query ? `?${query}` : "");
  return (
    <Link href={target} prefetch={false} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
