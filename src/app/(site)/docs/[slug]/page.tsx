import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
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
