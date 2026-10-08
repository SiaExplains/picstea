import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/marketing/JsonLd";
import { breadcrumbList, graph, type Crumb } from "@/lib/seo/jsonld";
import type { Placement } from "@/lib/sponsorship/sponsorship";
import { AdSlot } from "./AdSlot";
import { EditorLink } from "./EditorLink";
import styles from "./site.module.css";

/**
 * A readable content page with breadcrumbs (visible and structured), an optional note and a
 * sidebar ad space that never overlaps the text.
 */
export function ContentPage({
  crumbs,
  title,
  lead,
  meta,
  note,
  structuredData = [],
  ad = "site-sidebar",
  children,
}: {
  crumbs: readonly Crumb[];
  title: string;
  lead?: string;
  meta?: ReactNode;
  note?: ReactNode;
  structuredData?: object[];
  ad?: Exclude<Placement, "editor-start"> | null;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <JsonLd data={graph(breadcrumbList(crumbs), ...structuredData)} />
      <article className={styles.article}>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <ol>
            {crumbs.map((c, i) => (
              <li key={c.path}>
                {i < crumbs.length - 1 ? (
                  c.path === "/" ? (
                    <EditorLink>{c.name}</EditorLink>
                  ) : (
                    <Link href={c.path}>{c.name}</Link>
                  )
                ) : (
                  <span aria-current="page">{c.name}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1>{title}</h1>
        {meta && <p className={styles.meta}>{meta}</p>}
        {note && <p className={styles.note}>{note}</p>}
        {lead && <p className={styles.lead}>{lead}</p>}
        <div className={styles.prose}>{children}</div>
      </article>
      {ad && (
        <aside className={styles.sidebar} aria-label="Advertising">
          <AdSlot placement={ad} />
        </aside>
      )}
    </div>
  );
}
