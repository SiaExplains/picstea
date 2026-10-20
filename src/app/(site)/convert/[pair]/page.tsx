import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";
import { CONVERTERS, converterById, conversionLabel } from "@/content/converters";
import Link from "next/link";

export function generateStaticParams() {
  return CONVERTERS.map((c) => ({ pair: c.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/convert/[pair]">): Promise<Metadata> {
  const page = converterById((await params).pair);
  if (!page) return {};
  const path = `/convert/${page.id}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ url: path, title: page.title, description: page.description }),
  };
}

/** Read inside Suspense like the docs pages; every pair is prerendered, so the HTML is complete. */
export default function ConverterPage({ params }: PageProps<"/convert/[pair]">) {
  return (
    <Suspense>
      <Converter params={params} />
    </Suspense>
  );
}

async function Converter({ params }: Pick<PageProps<"/convert/[pair]">, "params">) {
  const page = converterById((await params).pair);
  if (!page) notFound();
  const path = `/convert/${page.id}`;
  const label = conversionLabel(page.id);
  return (
    <LandingPage
      path={path}
      title={page.title}
      lead={page.lead}
      faqs={page.faqs}
      cta={{ href: `/?convert=${page.id}`, label: `Convert ${label} now — free` }}
    >
      <h2>How to convert {label}</h2>
      <ol>
        <li>Click Convert {label} now. Picstea&apos;s editor opens with the converter ready.</li>
        <li>Drop your files on the converter, or click to choose them.</li>
        <li>Check the output format and, for JPG or WebP, the quality.</li>
        <li>Click Convert and save the file (several files are saved as one ZIP).</li>
      </ol>
      {page.body()}
      <h2>Other converters</h2>
      <ul>
        {CONVERTERS.filter((c) => c.id !== page.id).map((c) => (
          <li key={c.id}>
            <Link href={`/convert/${c.id}`}>{conversionLabel(c.id)}</Link>
          </li>
        ))}
      </ul>
      <RelatedTools current={path} />
    </LandingPage>
  );
}
