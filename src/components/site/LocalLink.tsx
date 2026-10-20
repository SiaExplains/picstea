import Link from "next/link";
import type { ComponentProps } from "react";
import { localizedPath } from "@/i18n/locales";
import { currentLocale } from "@/i18n/server";
import { isTranslatedPath } from "@/i18n/translated-paths";

/**
 * A website link that stays in the visitor's language when the target page is translated
 * (`/png-editor` → `/de/png-editor`), and goes to the English page otherwise (docs, blog, legal).
 * Content files import it as `Link`, so translated copy keeps plain-looking links (ADR-0039).
 */
export async function LocalLink({
  href,
  ...props
}: ComponentProps<typeof Link> & { href: string }) {
  const locale = await currentLocale();
  const [path, hash] = href.split("#");
  const target = isTranslatedPath(path) ? localizedPath(path, locale) : path;
  return <Link href={hash ? `${target}#${hash}` : target} {...props} />;
}
