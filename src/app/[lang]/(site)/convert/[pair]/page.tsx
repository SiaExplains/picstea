import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConverterList } from "@/components/site/ConverterList";
import { LandingPage } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";
import { CONVERTER_IDS, converterFor } from "@/content/converters";
import { LOCALES, type Locale } from "@/i18n/locales";
import { currentLocale, siteMessages } from "@/i18n/server";
import { fill } from "@/i18n/site";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

export function generateStaticParams() {
  return CONVERTER_IDS.map((pair) => ({ pair }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/convert/[pair]">): Promise<Metadata> {
  const { pair } = await params;
  if (!CONVERTER_IDS.includes(pair)) return {};
  const copy = {} as Record<Locale, { title: string; description: string }>;
  for (const locale of LOCALES) copy[locale] = converterFor(locale, pair)!;
  return translatedMetadata(`/convert/${pair}`, copy);
}

/** Read inside Suspense like the docs pages; every pair is prerendered, so the HTML is complete. */
export default function ConverterPage({ params }: PageProps<"/[lang]/convert/[pair]">) {
  return (
    <Suspense>
      <Converter params={params} />
    </Suspense>
  );
}

async function Converter({ params }: Pick<PageProps<"/[lang]/convert/[pair]">, "params">) {
  const page = converterFor(await currentLocale(), (await params).pair);
  if (!page) notFound();
  const t = await siteMessages();
  const path = `/convert/${page.id}`;
  const label = { label: page.label };
  return (
    <LandingPage
      path={path}
      title={page.title}
      lead={page.lead}
      faqs={page.faqs}
      cta={{ href: `/?convert=${page.id}`, label: fill(t.converter.cta, label) }}
    >
      <h2>{fill(t.converter.howTo, label)}</h2>
      <ol>
        <li>{fill(t.converter.step1, label)}</li>
        <li>{t.converter.step2}</li>
        <li>{t.converter.step3}</li>
        <li>{t.converter.step4}</li>
      </ol>
      {page.body()}
      <h2>{t.converter.others}</h2>
      <ConverterList except={page.id} />
      <RelatedTools current={path} />
    </LandingPage>
  );
}
