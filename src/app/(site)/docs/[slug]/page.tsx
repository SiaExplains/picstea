import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentPage } from "@/components/site/ContentPage";
import { DOCS, docBySlug } from "@/content/docs";

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const doc = docBySlug((await params).slug);
  if (!doc) return {};
  const path = `/docs/${doc.slug}`;
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: path },
    openGraph: { url: path, title: doc.title, description: doc.description, type: "article" },
  };
}

/**
 * The URL is read inside Suspense so the route's shared shell doesn't depend on it (instant
 * navigation). Every slug is prerendered, so the static HTML still contains the full page.
 */
export default function DocPage({ params }: PageProps<"/docs/[slug]">) {
  return (
    <Suspense>
      <Doc params={params} />
    </Suspense>
  );
}

async function Doc({ params }: Pick<PageProps<"/docs/[slug]">, "params">) {
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
    </ContentPage>
  );
}
