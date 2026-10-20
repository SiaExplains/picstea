import type { ReactNode } from "react";
import type { Faq } from "@/components/site/LandingPage";
import type { Locale } from "@/i18n/locales";

/**
 * One translated website page (ADR-0039): `src/content/pages/<slug>/<locale>.tsx` each export a
 * `PageCopy`, and `<slug>/index.ts` collects them. The body is server-rendered JSX; internal links
 * use `LocalLink` (imported as `Link`) so they stay in the page's language.
 */
export interface PageCopy {
  readonly title: string;
  /** 50–160 characters (site audit). */
  readonly description: string;
  readonly lead: string;
  readonly faqs: readonly Faq[];
  readonly body: () => ReactNode;
}

export type Translated<T> = Readonly<Record<Locale, T>>;
