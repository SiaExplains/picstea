import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import Link from "next/link";
import { ContentPage } from "@/components/site/ContentPage";
import styles from "@/components/site/site.module.css";
import { DOCS } from "@/content/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How to use Picstea, the free online image editor: layers, masks, selections, painting, file formats, shortcuts and privacy.",
  alternates: { canonical: "/docs" },
  openGraph: pageOpenGraph({ url: "/docs", title: "Picstea documentation" }),
};

export default function DocsIndex() {
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
      ]}
      title="Documentation"
      lead="Everything Picstea can do today, how to use it, and what it can't do yet."
    >
      <ul className={styles.list}>
        {DOCS.map((doc) => (
          <li key={doc.slug}>
            <h2>
              <Link href={`/docs/${doc.slug}`}>{doc.title}</Link>
            </h2>
            <p>{doc.description}</p>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
