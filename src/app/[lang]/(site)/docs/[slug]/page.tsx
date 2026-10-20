import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentPage } from "@/components/site/ContentPage";
import styles from "@/components/site/site.module.css";
import { DOCS, docBySlug } from "@/content/docs";

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/docs/[slug]">): Promise<Metadata> {
  const doc = docBySlug((await params).slug);
  if (!doc) return {};
  const path = `/docs/${doc.slug}`;
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ url: path, title: doc.title, description: doc.description, type: "article" }),
  };
}

/**
 * The URL is read inside Suspense so the route's shared shell doesn't depend on it (instant
 * navigation). Every slug is prerendered, so the static HTML still contains the full page.
 */
export default function DocPage({ params }: PageProps<"/[lang]/docs/[slug]">) {
  return (
    <Suspense>
      <Doc params={params} />
    </Suspense>
  );
}

async function Doc({ params }: Pick<PageProps<"/[lang]/docs/[slug]">, "params">) {
  const doc = docBySlug((await params).slug);
  if (!doc) notFound();
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: doc.title, path: `/docs/${doc.slug}` },
      ]}
      title={doc.title}
      meta={`Updated ${doc.updated}`}
    >
      {doc.body()}
      <DocNavigation slug={doc.slug} />
    </ContentPage>
  );
}

/** Previous and next documentation pages, in the order of the docs index. */
function DocNavigation({ slug }: { slug: string }) {
  const i = DOCS.findIndex((d) => d.slug === slug);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  if (!prev && !next) return null;
  return (
    <nav aria-label="Documentation pages" className={styles.prevNext}>
      {prev ? <Link href={`/docs/${prev.slug}`}>← {prev.title}</Link> : <span />}
      {next && <Link href={`/docs/${next.slug}`}>{next.title} →</Link>}
    </nav>
  );
}
