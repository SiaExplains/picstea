import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A link from a website page to the editor (`/`). The editor has its own root layout, so this is
 * always a full page load: the editor starts with its strict security policy and without any ad
 * code a website page may have loaded (ADR-0013). Not prefetched, so content pages don't
 * download the editor bundle.
 */
export function EditorLink({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link href="/" prefetch={false} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
